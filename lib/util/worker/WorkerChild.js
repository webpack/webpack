/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { parentPort, workerData } = require("worker_threads");
const { WORKER_DATA_KIND, encodeError, toError } = require("./protocol");

/** @typedef {import("worker_threads").MessagePort} MessagePort */
/** @typedef {import("./protocol").CallMessage} CallMessage */
/** @typedef {import("./protocol").CloseMessage} CloseMessage */
/** @typedef {import("./protocol").MainToWorkerMessage} MainToWorkerMessage */
/** @typedef {import("./protocol").PreloadMessage} PreloadMessage */
/** @typedef {import("./protocol").ResponseMessage} ResponseMessage */
/** @typedef {import("./protocol").WorkerData} WorkerData */

/**
 * The thread side of the pool: answers calls from the port, loading modules on first use.
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
	}

	/**
	 * Attaches to the port.
	 * @returns {void}
	 */
	start() {
		this.port.on("message", (message) => {
			this.receive(message).catch((error) => {
				// WHY: a failure outside a call (a preload) has no response to
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
			case "call":
				await this._answer(message);
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
				error: encodeError(error)
			});
			return;
		}
		this.port.postMessage({ type: "preloaded", id: message.id, ok: true });
	}

	/**
	 * Runs a call and posts its response.
	 * @param {CallMessage} message the call
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
			response = {
				type: "response",
				id: message.id,
				ok: true,
				value: await fn(...message.args)
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
