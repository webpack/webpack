/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { Worker } = require("worker_threads");
const WorkerBackend = require("./WorkerBackend");

/**
 * Worker backend using Node.js worker_threads.
 * @extends {WorkerBackend}
 */
class ThreadWorkerBackend extends WorkerBackend {
	/**
	 * @param {string} workerPath absolute path to the worker script
	 * @param {EXPECTED_ANY=} workerData data passed to Worker constructor
	 */
	constructor(workerPath, workerData) {
		super();
		this._worker = new Worker(workerPath, { workerData });
		this._worker.unref();
	}

	/**
	 * @param {EXPECTED_ANY} msg message
	 * @returns {void}
	 */
	send(msg) {
		this._worker.postMessage(msg);
	}

	/**
	 * @param {(msg: EXPECTED_ANY) => void} handler message handler
	 * @returns {void}
	 */
	onMessage(handler) {
		this._worker.on("message", handler);
	}

	/**
	 * @param {(err: Error) => void} handler error handler
	 * @returns {void}
	 */
	onError(handler) {
		this._worker.on("error", handler);
	}

	/**
	 * @returns {Promise<void>}
	 */
	terminate() {
		return this._worker.terminate().then(() => {});
	}
}

module.exports = ThreadWorkerBackend;
