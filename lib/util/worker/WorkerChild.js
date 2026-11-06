/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { parentPort, workerData } = require("worker_threads");
const {
	WORKER_DATA_KIND,
	decodeError,
	encodeError,
	toError
} = require("./protocol");

/** @typedef {import("worker_threads").MessagePort} MessagePort */
/** @typedef {import("./protocol").JobMessage} JobMessage */
/** @typedef {import("./protocol").MainToWorkerMessage} MainToWorkerMessage */
/** @typedef {import("./protocol").PreloadMessage} PreloadMessage */
/** @typedef {import("./protocol").ResponseMessage} ResponseMessage */
/** @typedef {import("./protocol").RpcResultMessage} RpcResultMessage */
/** @typedef {import("./protocol").WorkerData} WorkerData */

/**
 * The context a loader job receives. It forwards main-thread calls to the pool.
 * @typedef {object} LoaderContext
 * @property {number} workerId id the pool gave this thread
 * @property {(method: string, args: unknown[]) => Promise<unknown>} callMain calls a main-thread handler and waits
 * @property {(method: string, args: unknown[]) => void} callMainNoWait calls a main-thread handler without waiting
 */

/**
 * The thread side of the pool: answers jobs from the port, loading modules on first use.
 */
class WorkerChild {
	/**
	 * @param {MessagePort} port the port to the pool
	 * @param {number} workerId id the pool gave this thread
	 */
	constructor(port, workerId) {
		this.port = port;
		this.workerId = workerId;
		/** @type {Map<string, Promise<Record<string, unknown>>>} */
		this._modules = new Map();
		/** @type {Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>} */
		this._rpc = new Map();
		this._nextRpcId = 1;
	}

	/**
	 * Attaches to the port.
	 * @returns {void}
	 */
	start() {
		this.port.on("message", (message) => {
			this.receive(message).catch((error) => {
				// WHY: a failure outside a job (a preload) has no response to
				// travel in; rethrowing ends the thread, and the pool reports it
				// through the thread's `error` and `exit` events.
				process.nextTick(() => {
					throw error;
				});
			});
		});
	}

	/**
	 * Handles one message from the pool.
	 * @param {MainToWorkerMessage} message the message
	 * @returns {Promise<void>} settled when it was handled
	 */
	async receive(message) {
		switch (message.type) {
			case "preload":
				await this._preload(message);
				break;
			case "job":
				// Jobs may run beside each other; their RPC calls interleave.
				this._answer(message);
				break;
			case "rpc-result":
				this._settleRpc(message);
				break;
			case "close":
				this.close();
				break;
		}
	}

	/**
	 * Loads a module on first use.
	 * @param {string} module absolute path
	 * @returns {Promise<Record<string, unknown>>} the module
	 */
	load(module) {
		let loaded = this._modules.get(module);
		if (loaded === undefined) {
			loaded = Promise.resolve().then(() => require(module));
			this._modules.set(module, loaded);
		}
		return loaded;
	}

	/**
	 * Detaches from the port.
	 * @returns {void}
	 */
	close() {
		this.port.close();
	}

	/**
	 * @param {PreloadMessage} message the preload
	 * @returns {Promise<void>} settled when every module loaded
	 */
	async _preload(message) {
		try {
			await Promise.all(message.modules.map((module) => this.load(module)));
		} catch (error) {
			this.port.postMessage({
				type: "preloaded",
				id: message.id,
				ok: false,
				error: encodeError(toError(error))
			});
			return;
		}
		this.port.postMessage({ type: "preloaded", id: message.id, ok: true });
	}

	/**
	 * Runs a job and posts its response.
	 * @param {JobMessage} message the job
	 * @returns {Promise<void>} settled when the response was posted
	 */
	async _answer(message) {
		/** @type {ResponseMessage} */
		let response;
		try {
			const loaded = await this.load(message.module);
			const fn = loaded[message.method];
			if (typeof fn !== "function") {
				throw new Error(
					`${message.module} has no export named ${message.method}`
				);
			}
			const value = message.rpc
				? await fn(this._createContext(message.id), ...message.args)
				: await fn(...message.args);
			response = {
				type: "response",
				id: message.id,
				ok: true,
				value
			};
		} catch (error) {
			response = {
				type: "response",
				id: message.id,
				ok: false,
				error: encodeError(toError(error))
			};
		}
		try {
			this.port.postMessage(response);
		} catch (error) {
			this.port.postMessage({
				type: "response",
				id: message.id,
				ok: false,
				error: encodeError(toError(error))
			});
		}
	}

	/**
	 * @param {number} jobId the job this context belongs to
	 * @returns {LoaderContext} its RPC context
	 */
	_createContext(jobId) {
		return {
			workerId: this.workerId,
			callMain: (method, args) =>
				new Promise((resolve, reject) => {
					const callId = this._nextRpcId++;
					this._rpc.set(callId, { resolve, reject });
					this.port.postMessage({
						type: "rpc",
						jobId,
						callId,
						method,
						args
					});
				}),
			callMainNoWait: (method, args) => {
				this.port.postMessage({ type: "rpc", jobId, method, args });
			}
		};
	}

	/**
	 * @param {RpcResultMessage} message the result
	 * @returns {void}
	 */
	_settleRpc(message) {
		const pending = this._rpc.get(message.callId);
		if (pending === undefined) return;
		this._rpc.delete(message.callId);
		if (message.ok) {
			pending.resolve(message.value);
		} else {
			pending.reject(decodeError(message.error));
		}
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
