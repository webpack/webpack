/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {import("worker_threads").MessagePort} MessagePort */
/** @typedef {import("../../logging/Logger").Logger} Logger */
/** @typedef {import("./handle")} Handle */
/** @typedef {import("./handle").HandleFunction} HandleFunction */
/** @typedef {import("./protocol").CallTarget} CallTarget */
/** @typedef {import("./protocol").LogEntry} LogEntry */
/** @typedef {import("./protocol").MainToWorkerMessage} MainToWorkerMessage */
/** @typedef {import("./protocol").TransferListItem} TransferListItem */

/**
 * @template T
 * @typedef {import("./protocol").TransferResult<T>} TransferResult
 */

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
		/** @type {Map<string, WorkerModule>} */
		this._modules = new Map();
		/** @type {Map<number, unknown>} */
		this._shared = new Map();
		/** @type {Map<number, HandleFunction>} */
		this._exposed = new Map();
		/** @type {Map<number, PendingMainCall>} */
		this._pending = new Map();
		/** @type {LogEntry[]} */
		this._logBatch = [];
		this._nextCallId = 1;
		this._nextHandleId = 1;
	}

	/**
	 * Builds the context, attaches to the port and announces readiness.
	 * @returns {void}
	 */
	start() {
		throw new Error("Not implemented");
	}

	/**
	 * Handles one message from the farm.
	 * @param {MainToWorkerMessage} message the message
	 * @returns {Promise<void>} settled when it was handled
	 */
	receive(message) {
		throw new Error("Not implemented");
	}

	/**
	 * Loads a target's module on first use and runs its `init` once.
	 * @param {string} module absolute path
	 * @returns {Promise<WorkerModule>} the module
	 */
	load(module) {
		throw new Error("Not implemented");
	}

	/**
	 * Flushes batched log entries and detaches from the port.
	 * @returns {void}
	 */
	close() {
		throw new Error("Not implemented");
	}
}

module.exports = WorkerChild;
