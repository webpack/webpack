/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./WorkerPool")} WorkerPool */

/**
 * A module path bound to the compiler's worker pool. Calls run on a thread when available, inline otherwise.
 */
class Worker {
	/**
	 * @param {WorkerPool} pool the compiler's pool
	 * @param {string} module absolute path of the module
	 */
	constructor(pool, module) {
		this._pool = pool;
		this._module = module;
	}

	/**
	 * Calls one export of the module.
	 * @template T
	 * @param {string} method name of the export
	 * @param {...unknown} args arguments
	 * @returns {Promise<T>} what the method returned
	 */
	run(method, ...args) {
		if (typeof method !== "string" || method.length === 0) {
			throw new TypeError("'method' must be a non-empty string");
		}
		return /** @type {Promise<T>} */ (
			this._pool.run(this._module, method, args)
		);
	}

	/**
	 * Spawns up to `workers` threads and preloads this module in each.
	 * @param {number=} workers number of threads to reach; defaults to the pool's `max`
	 * @returns {Promise<void>} settled when every targeted thread loaded the module
	 */
	warmup(workers) {
		return this._pool.warmup([this._module], workers);
	}

	/**
	 * Releases idle threads. Calls in flight finish; the pool stays usable.
	 * @returns {Promise<void>} settled when the idle threads exited
	 */
	release() {
		return this._pool.release();
	}
}

module.exports = Worker;
