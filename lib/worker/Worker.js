/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./WorkerPool")} WorkerPool */
/** @typedef {import("./protocol").CloneableValue} CloneableValue */
/**
 * Constraint for a worker module: any exports. Only the ones a caller runs
 * need to be functions.
 * @typedef {Record<string, unknown>} WorkerModule
 */

/**
 * Untyped facade: every method takes and returns cloneable values.
 * @typedef {Record<string, (...args: CloneableValue[]) => CloneableValue | Promise<CloneableValue>>} WorkerDefaultModule
 */

/**
 * Options for `compiler.worker()`. Fields reuse the jest-worker or thread-loader name when the purpose matches.
 * @typedef {object} WorkerOptions
 * @property {number=} numWorkers without `experiments.threads`, run on up to this many threads (at most one less than the CPUs) instead of inline; `0` runs inline. Ignored when `experiments.threads` is set, which configures the threads.
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
	 * @param {WorkerOptions=} options options
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
	 * @param {Parameters<Extract<M[K], (...args: never[]) => void>>} args arguments
	 * @returns {Promise<Awaited<ReturnType<Extract<M[K], (...args: never[]) => void>>>>} what the method returned
	 */
	run(method, ...args) {
		if (typeof method !== "string" || method.length === 0) {
			return Promise.reject(
				new TypeError("'method' must be a non-empty string")
			);
		}
		return /** @type {Promise<Awaited<ReturnType<Extract<M[K], (...args: never[]) => void>>>>} */ (
			this._pool.run(this._module, method, args)
		);
	}
}

module.exports = Worker;
