/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const workerThreads = require("worker_threads");

const parentPort = workerThreads.parentPort;

const {
	CHILD_MESSAGE_CALL,
	CHILD_MESSAGE_END,
	CHILD_MESSAGE_PRELOAD,
	CHILD_MESSAGE_RPC_RESULT,
	PARENT_MESSAGE_CLIENT_ERROR,
	PARENT_MESSAGE_OK,
	PARENT_MESSAGE_PRELOADED,
	PARENT_MESSAGE_RPC,
	WORKER_DATA_KIND,
	decodeError,
	encodeError,
	toError
} = require("./protocol");

/** @import { MessagePort } from "worker_threads" */
/** @import { JobMessage, MainToWorkerMessage, PreloadMessage, ResponseMessage, RpcResultMessage, WorkerData, CloneableValue, RpcContext, WorkerExports } from "./protocol.js" */

/** @type {WorkerData | null} */
const workerData = workerThreads.workerData;

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
		/** @type {Map<string, Promise<WorkerExports>>} */
		this._modules = new Map();
		/** @type {Map<number, { jobId: number, resolve: (value: CloneableValue) => void, reject: (error: Error) => void }>} */
		this._rpc = new Map();
		this._nextRpcId = 1;
	}

	/**
	 * Attaches to the port.
	 * @returns {void}
	 */
	start() {
		this.port.on("message", (/** @type {MainToWorkerMessage} */ message) => {
			this.receive(message).catch((/** @type {ThrownValue} */ error) => {
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
		if (!Array.isArray(message)) {
			throw new TypeError("Unexpected request from parent process");
		}
		switch (message[0]) {
			case CHILD_MESSAGE_PRELOAD:
				await this._preload(message);
				break;
			case CHILD_MESSAGE_CALL:
				// Jobs may run beside each other; their RPC calls interleave.
				await this._answer(message);
				break;
			case CHILD_MESSAGE_RPC_RESULT:
				this._settleRpc(message);
				break;
			case CHILD_MESSAGE_END:
				this.close();
				break;
			default:
				throw new TypeError(
					`Unexpected request from parent process: ${message[0]}`
				);
		}
	}

	/**
	 * Loads a module on first use.
	 * @param {string} module absolute path
	 * @returns {Promise<WorkerExports>} the module
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
		for (const pending of this._rpc.values()) {
			pending.reject(new Error("The worker closed"));
		}
		this._rpc.clear();
		if (typeof this.port.close === "function") {
			this.port.close();
		} else if (typeof this.port.unref === "function") {
			// Deno's `parentPort` has no `close()`; without the unref its
			// thread never exits, and `end()` waits for the forced termination.
			this.port.unref();
		}
	}

	/**
	 * @param {PreloadMessage} message the preload
	 * @returns {Promise<void>} settled when every module loaded
	 */
	async _preload(message) {
		try {
			await Promise.all(message[2].map((module) => this.load(module)));
		} catch (error) {
			this.port.postMessage([
				PARENT_MESSAGE_PRELOADED,
				message[1],
				false,
				...encodeError(toError(error))
			]);
			return;
		}
		this.port.postMessage([PARENT_MESSAGE_PRELOADED, message[1], true]);
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
			const loaded = await this.load(message[2]);
			const fn = loaded[message[3]];
			if (typeof fn !== "function") {
				throw new Error(`${message[2]} has no export named ${message[3]}`);
			}
			const value = message[5]
				? await fn(this._createContext(message[1]), ...message[4])
				: await fn(...message[4]);
			response = [PARENT_MESSAGE_OK, message[1], value];
		} catch (error) {
			response = [
				PARENT_MESSAGE_CLIENT_ERROR,
				message[1],
				...encodeError(toError(error))
			];
		}
		try {
			this.port.postMessage(response);
		} catch (error) {
			this.port.postMessage([
				PARENT_MESSAGE_CLIENT_ERROR,
				message[1],
				...encodeError(toError(error))
			]);
		} finally {
			for (const [callId, pending] of this._rpc) {
				if (pending.jobId !== message[1]) continue;
				this._rpc.delete(callId);
				pending.reject(new Error("The loader job finished"));
			}
		}
	}

	/**
	 * @param {number} jobId the job this context belongs to
	 * @returns {RpcContext} its RPC context
	 */
	_createContext(jobId) {
		return {
			workerId: this.workerId,
			callMain: (method, args) =>
				/** @type {Promise<CloneableValue>} */ (
					new Promise((resolve, reject) => {
						const callId = this._nextRpcId++;
						this._rpc.set(callId, { jobId, resolve, reject });
						try {
							this.port.postMessage([
								PARENT_MESSAGE_RPC,
								jobId,
								callId,
								method,
								args
							]);
						} catch (error) {
							this._rpc.delete(callId);
							reject(toError(error));
						}
					})
				),
			callMainNoWait: (method, args) => {
				try {
					this.port.postMessage([PARENT_MESSAGE_RPC, jobId, 0, method, args]);
				} catch (_err) {
					// A fire-and-forget call has no response channel to report the clone failure in.
				}
			}
		};
	}

	/**
	 * @param {RpcResultMessage} message the result
	 * @returns {void}
	 */
	_settleRpc(message) {
		const pending = this._rpc.get(message[2]);
		if (pending === undefined) return;
		this._rpc.delete(message[2]);
		if (message[3]) {
			pending.resolve(message[4]);
		} else {
			pending.reject(
				decodeError(
					/** @type {import("./protocol").EncodedError} */ (message.slice(4))
				)
			);
		}
	}
}

module.exports = WorkerChild;

if (
	parentPort !== null &&
	workerData !== null &&
	typeof workerData === "object" &&
	workerData.kind === WORKER_DATA_KIND
) {
	new WorkerChild(parentPort, workerData.workerId).start();
}
