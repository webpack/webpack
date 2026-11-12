/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./WorkerPool")} WorkerPool */
/**
 * Constraint for a worker module: any exports. Only the ones a caller runs
 * need to be functions.
 * @typedef {Record<string, unknown>} WorkerModule
 */

/**
 * Untyped facade: every method takes and returns `unknown`.
 * @typedef {Record<string, (...args: unknown[]) => unknown>} WorkerDefaultModule
 */

/**
 * Options for `compiler.worker()`. No fields are supported yet; future fields reuse the jest-worker or thread-loader name when the purpose matches.
 * @typedef {Record<string, never>} WorkerOptions
 */

/**
 * A module path bound to the compiler's worker pool. Calls run on a thread when available, inline otherwise.
 * @template {WorkerModule} [M=WorkerDefaultModule] exports of the worker module
 * @since 5.113.0
 * @experimental
 */
class Worker {
	/**
	 * @param {WorkerPool} pool the compiler's pool
	 * @param {string} module absolute path of the module
	 * @param {WorkerOptions=} options reserved options
	 */
	constructor(pool, module, options) {
		this._pool = pool;
		this._module = module;
		this._options = options;
	}

	/**
	 * Calls one export of the module.
	 * @template {keyof M & string} K
	 * @param {K} method name of the export
	 * @param {Parameters<Extract<M[K], (...args: never[]) => unknown>>} args arguments
	 * @returns {Promise<Awaited<ReturnType<Extract<M[K], (...args: never[]) => unknown>>>>} what the method returned
	 */
	run(method, ...args) {
		if (typeof method !== "string" || method.length === 0) {
			return Promise.reject(
				new TypeError("'method' must be a non-empty string")
			);
		}
		return /** @type {Promise<Awaited<ReturnType<Extract<M[K], (...args: never[]) => unknown>>>>} */ (
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
	 * Releases the shared pool's idle threads. Calls in flight finish; the pool stays usable.
	 * @returns {Promise<void>} settled when the released threads exited
	 */
	release() {
		return this._pool.release();
	}
}

module.exports = Worker;
