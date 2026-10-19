/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { parentPort, workerData } = require("worker_threads");
const { Logger } = require("../../logging/Logger");
const Handle = require("./Handle");
const {
	MESSAGE_TYPE,
	TransferResult,
	WORKER_DATA_KIND,
	decodeError,
	encodeError
} = require("./protocol");

/** @typedef {import("worker_threads").MessagePort} MessagePort */
/** @typedef {import("./Handle").HandleFunction} HandleFunction */
/** @typedef {import("./protocol").CallTarget} CallTarget */
/** @typedef {import("./protocol").LogEntry} LogEntry */
/** @typedef {import("./protocol").CallMessage} CallMessage */
/** @typedef {import("./protocol").MainToWorkerMessage} MainToWorkerMessage */
/** @typedef {import("./protocol").ResponseMessage} ResponseMessage */
/** @typedef {import("./protocol").WorkerData} WorkerData */
/** @typedef {import("../../logging/Logger").LogTypeEnum} LogTypeEnum */
/** @typedef {import("./protocol").TransferListItem} TransferListItem */

/**
 * @typedef {object} CallMainOptions
 * @property {TransferListItem[]=} transfer handed over instead of copied
 * @property {boolean=} awaitResponse `false` sends without an id and resolves at once
 */

/**
 * The first argument of every worker export, with the same shape on the main thread.
 * @typedef {object} WorkerContext
 * @property {boolean} isWorker `false` on the inline path
 * @property {number | undefined} workerId `undefined` on the inline path
 * @property {(ref: number) => unknown} getSharedReference the value the main thread shared under that number
 * @property {(target: CallTarget, args: unknown[], options?: CallMainOptions) => Promise<unknown>} callMain calls a module or a handle on the main thread
 * @property {(handle: Handle, args: unknown[]) => Promise<unknown>} callHandle calls a function the main thread exposed
 * @property {(fn: HandleFunction) => Handle} expose hands a callback the other way
 * @property {(name: string) => Logger} getLogger a logger whose entries reach the main thread's infrastructure logger, batched
 * @property {<T>(value: T, transfer: TransferListItem[]) => TransferResult<T>} transfer marks the buffers of a result to hand over instead of copy
 */

/** @typedef {(context: WorkerContext, ...args: EXPECTED_ANY[]) => unknown} WorkerMethod */

/**
 * A module a call can target: CommonJS, every export a method, `init` run once per thread before the first call.
 * @typedef {{ init?: (context: WorkerContext) => Promise<void> | void } & Record<string, WorkerMethod | undefined>} WorkerModule
 */

/**
 * A call this side made to the main thread and is waiting on.
 * @typedef {object} PendingMainCall
 * @property {(value: unknown) => void} resolve settles the caller
 * @property {(error: Error) => void} reject settles the caller
 */

/**
 * The thread side of the farm: answers calls from the port, and is the `WorkerContext` behind every module it loads.
 */
class WorkerChild {
	/**
	 * @param {MessagePort} port the port to the farm
	 * @param {number} workerId id the farm gave this thread
	 */
	constructor(port, workerId) {
		this.port = port;
		this.workerId = workerId;
		/** @type {WorkerContext | undefined} */
		this.context = undefined;
		/** @type {Map<string, Promise<WorkerModule>>} */
		this._modules = new Map();
		/** @type {Map<number, unknown>} */
		this._shared = new Map();
		/** @type {Map<number, HandleFunction>} */
		this._exposed = new Map();
		/** @type {Map<number, PendingMainCall>} */
		this._pending = new Map();
		/** @type {LogEntry[]} */
		this._logBatch = [];
		/** @type {Promise<void> | undefined} */
		this._initialized = undefined;
		this._nextCallId = 1;
		this._nextHandleId = 1;
	}

	/**
	 * Builds the context, attaches to the port and announces readiness.
	 * @returns {void}
	 */
	start() {
		this.context = {
			isWorker: true,
			workerId: this.workerId,
			getSharedReference: (ref) => {
				if (!this._shared.has(ref)) {
					throw new Error(`No shared reference ${ref}`);
				}
				return this._shared.get(ref);
			},
			callMain: (target, args, options) =>
				this._callMain(target, args, options),
			callHandle: (handle, args) => this._callMain({ handle: handle.id }, args),
			expose: (fn) => {
				const id = this._nextHandleId++;
				this._exposed.set(id, fn);
				return new Handle(id, this.workerId);
			},
			getLogger: (name) => this._createLogger(name),
			transfer: (value, transfer) => new TransferResult(value, transfer)
		};
		this.port.on("message", (message) => {
			this.receive(message).catch((error) => {
				// WHY: an error outside any call (a failed preload) has no response
				// to travel in; rethrowing it uncaught ends the thread, and the farm
				// reports it through the thread's `error` and `exit` events.
				process.nextTick(() => {
					throw error;
				});
			});
		});
	}

	/**
	 * Handles one message from the farm.
	 * @param {MainToWorkerMessage} message the message
	 * @returns {Promise<void>} settled when it was handled
	 */
	async receive(message) {
		if (message.type === MESSAGE_TYPE.INIT) {
			this._initialized = Promise.all(
				message.preload.map((module) => this.load(module))
			).then(() => {
				this.port.postMessage({
					type: MESSAGE_TYPE.READY,
					workerId: this.workerId
				});
			});
			return this._initialized;
		}
		await this._initialized;
		switch (message.type) {
			case MESSAGE_TYPE.SHARE:
				this._shared.set(message.ref, message.value);
				break;
			case MESSAGE_TYPE.UNSHARE:
				this._shared.delete(message.ref);
				break;
			case MESSAGE_TYPE.CALL:
				await this._answer(message);
				break;
			case MESSAGE_TYPE.RESPONSE:
				this._settle(message);
				break;
			case MESSAGE_TYPE.CLOSE:
				this.close();
				break;
		}
	}

	/**
	 * Loads a target's module on first use and runs its `init` once.
	 * @param {string} module absolute path
	 * @returns {Promise<WorkerModule>} the module
	 */
	load(module) {
		let loaded = this._modules.get(module);
		if (loaded === undefined) {
			loaded = Promise.resolve().then(() => {
				/** @type {WorkerModule} */
				const workerModule = require(module);

				if (typeof workerModule.init !== "function") return workerModule;
				return Promise.resolve(
					workerModule.init(/** @type {WorkerContext} */ (this.context))
				).then(() => workerModule);
			});
			this._modules.set(module, loaded);
		}
		return loaded;
	}

	/**
	 * Flushes batched log entries and detaches from the port.
	 * @returns {void}
	 */
	close() {
		this._flushLog();
		this.port.close();
	}

	/**
	 * Runs a call from the farm and posts its response when one was asked for.
	 * @param {CallMessage} message the call
	 * @returns {Promise<void>} settled when the response was posted
	 */
	async _answer(message) {
		const { id } = message;
		/** @type {ResponseMessage} */
		let response;
		/** @type {TransferListItem[]} */
		let transfer = [];
		try {
			let value = await this._run(message.target, message.args);
			if (value instanceof TransferResult) {
				transfer = value.transfer;
				value = value.value;
			}
			if (id === undefined) return;
			response = { type: MESSAGE_TYPE.RESPONSE, id, ok: true, value };
		} catch (error) {
			if (id === undefined) {
				const encoded = encodeError(error, this.workerId);
				this._log("webpack.WorkerChild", "error", [
					encoded.stack || encoded.message
				]);
				return;
			}
			response = {
				type: MESSAGE_TYPE.RESPONSE,
				id,
				ok: false,
				error: encodeError(error, this.workerId)
			};
		}
		this._flushLog();
		try {
			this.port.postMessage(response, transfer);
		} catch (error) {
			this.port.postMessage({
				type: MESSAGE_TYPE.RESPONSE,
				id,
				ok: false,
				error: encodeError(error, this.workerId)
			});
		}
	}

	/**
	 * Runs a target in this thread: an exposed function by handle, or a module's method.
	 * @param {CallTarget} target what to run
	 * @param {unknown[]} args arguments after the worker context
	 * @returns {Promise<unknown>} what it returned
	 */
	async _run(target, args) {
		if ("handle" in target) {
			const fn = this._exposed.get(target.handle);
			if (fn === undefined) {
				throw new Error(`No exposed function with handle ${target.handle}`);
			}
			return fn(...args);
		}
		const workerModule = await this.load(target.module);
		const method = workerModule[target.method];
		if (typeof method !== "function") {
			throw new Error(`${target.module} has no export named ${target.method}`);
		}
		return method(/** @type {WorkerContext} */ (this.context), ...args);
	}

	/**
	 * Calls a module or a handle on the main thread.
	 * @param {CallTarget} target what to run
	 * @param {unknown[]} args its arguments
	 * @param {CallMainOptions=} options options
	 * @returns {Promise<unknown>} what it returned; `undefined` at once when no response is awaited
	 */
	_callMain(target, args, options) {
		const transfer = (options !== undefined && options.transfer) || [];
		if (options !== undefined && options.awaitResponse === false) {
			this.port.postMessage(
				{ type: MESSAGE_TYPE.CALL, target, args },
				transfer
			);
			return Promise.resolve(undefined);
		}
		return new Promise((resolve, reject) => {
			const id = this._nextCallId++;
			this.port.postMessage(
				{ type: MESSAGE_TYPE.CALL, id, target, args },
				transfer
			);
			this._pending.set(id, { resolve, reject });
		});
	}

	/**
	 * Settles the call to the main thread a response answers.
	 * @param {ResponseMessage} message the response
	 * @returns {void}
	 */
	_settle(message) {
		const pending = this._pending.get(message.id);
		if (pending === undefined) return;
		this._pending.delete(message.id);
		if (message.ok) {
			pending.resolve(message.value);
		} else {
			pending.reject(decodeError(message.error));
		}
	}

	/**
	 * A logger whose entries are batched for the main thread.
	 * @param {string} name logger name
	 * @returns {Logger} the logger
	 */
	_createLogger(name) {
		return new Logger(
			(type, args) => this._log(name, type, args || []),
			(childName) =>
				this._createLogger(
					`${name}/${typeof childName === "function" ? childName() : childName}`
				)
		);
	}

	/**
	 * Appends an entry to the batch, scheduling a flush when the batch was empty.
	 * @param {string} name logger name
	 * @param {LogTypeEnum} type log type
	 * @param {unknown[]} args log arguments
	 * @returns {void}
	 */
	_log(name, type, args) {
		if (this._logBatch.length === 0) setImmediate(() => this._flushLog());
		this._logBatch.push({ name, type, args });
	}

	/**
	 * Posts the batched log entries, if any.
	 * @returns {void}
	 */
	_flushLog() {
		if (this._logBatch.length === 0) return;
		this.port.postMessage({ type: MESSAGE_TYPE.LOG, entries: this._logBatch });
		this._logBatch = [];
	}
}

module.exports = WorkerChild;

if (
	parentPort !== null &&
	workerData !== null &&
	typeof workerData === "object" &&
	/** @type {WorkerData} */ (workerData).kind === WORKER_DATA_KIND
) {
	new WorkerChild(
		parentPort,
		/** @type {WorkerData} */ (workerData).workerId
	).start();
}
