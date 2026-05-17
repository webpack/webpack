/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Abstract interface for worker communication backends.
 * Implementations: ThreadWorkerBackend (worker_threads), ProcessWorkerBackend (child_process).
 * @interface
 */
class WorkerBackend {
	/**
	 * Send a message to the worker.
	 * @param {EXPECTED_ANY} msg message
	 * @returns {void}
	 */
	send(msg) {
		throw new Error("Abstract");
	}

	/**
	 * Register a message handler.
	 * @param {(msg: EXPECTED_ANY) => void} handler handler
	 * @returns {void}
	 */
	onMessage(handler) {
		throw new Error("Abstract");
	}

	/**
	 * Register an error handler.
	 * @param {(err: Error) => void} handler handler
	 * @returns {void}
	 */
	onError(handler) {
		throw new Error("Abstract");
	}

	/**
	 * Terminate the worker.
	 * @returns {Promise<void>}
	 */
	terminate() {
		throw new Error("Abstract");
	}
}

module.exports = WorkerBackend;
