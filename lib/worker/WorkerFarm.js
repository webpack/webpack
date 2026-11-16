/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const os = require("os");
const { ABSOLUTE_PATH_REGEXP, fileUrlToPath } = require("../util/identifier");

/** @import Compiler from "../Compiler" */
/** @import Worker, { WorkerOptions } from "./Worker" */
/** @import WorkerPool from "./WorkerPool" */

/**
 * The compiler's worker resource: one pool and one facade per module path,
 * created lazily. Without threads its pool runs every call inline.
 */
class WorkerFarm {
	/**
	 * @param {Compiler} compiler the root compiler
	 */
	constructor(compiler) {
		/** @type {Compiler} */
		this._compiler = compiler;
		/** @type {WorkerPool | undefined} */
		this._pool = undefined;
		/** @type {Map<string, Worker> | undefined} */
		this._workers = undefined;
		/** @type {Promise<void> | undefined} */
		this._ending = undefined;
		this._closed = false;
		this._keepAlive = false;
	}

	/**
	 * The pool, or `undefined` once the farm is closing.
	 * @returns {WorkerPool | undefined} the pool
	 */
	getPool() {
		if (this._closed) return undefined;
		return this._createPool();
	}

	/**
	 * One facade per module path. Once the pool ends, a path that already had a
	 * facade keeps returning it; its calls reject through the ended pool.
	 * @param {string | URL} workerPath absolute path or file URL
	 * @param {WorkerOptions=} options reserved options
	 * @returns {Worker} the facade
	 */
	getWorker(workerPath, options) {
		if (this._closed && this._pool === undefined) {
			throw new Error(
				"compiler.worker() cannot create a worker after compiler.close()"
			);
		}
		const pool = this._createPool();
		const module = normalizeWorkerPath(workerPath);
		let workers = this._workers;
		if (workers === undefined) {
			workers = this._workers = new Map();
		}
		let worker = workers.get(module);
		if (worker === undefined) {
			worker = new (require("./Worker"))(pool, module, options);
			workers.set(module, worker);
		}
		return worker;
	}

	/**
	 * Keeps the pool's idle threads alive, e.g. for the length of a build; applies to a pool created later too.
	 * @param {boolean} keepAlive whether idle threads stay alive
	 * @returns {void}
	 */
	setKeepAlive(keepAlive) {
		this._keepAlive = keepAlive;
		if (this._pool !== undefined) this._pool.setKeepAlive(keepAlive);
	}

	/**
	 * Starts a build: idle threads stay alive until it ends.
	 * @returns {void}
	 */
	startBuild() {
		this.setKeepAlive(true);
	}

	/**
	 * Ends a build. Watching, the threads stay alive for the next one, except those that ran nothing since the previous build ended; otherwise their idle timers start.
	 * @param {boolean} watching whether a rebuild may follow
	 * @returns {void}
	 */
	endBuild(watching) {
		const pool = this._pool;
		if (watching) {
			if (pool !== undefined) pool.releaseUnused();
		} else {
			this.setKeepAlive(false);
		}
		if (pool !== undefined) pool.markUnused();
	}

	/**
	 * Marks the farm closing without ending the pool; `end()` does both.
	 * @returns {void}
	 */
	close() {
		this._closed = true;
	}

	/**
	 * Marks the farm closed and ends the pool once.
	 * @returns {Promise<void>} settled when every thread exited
	 */
	end() {
		this._closed = true;
		if (this._ending !== undefined) return this._ending;
		if (this._pool === undefined) return Promise.resolve();
		this._ending = this._pool.end();
		return this._ending;
	}

	/**
	 * @returns {WorkerPool} the pool
	 */
	_createPool() {
		let pool = this._pool;
		if (pool !== undefined) return pool;

		const WorkerPool = require("./WorkerPool");

		const { threads } = this._compiler.options.experiments;
		// Threads off is a plain call on the main thread, like a disabled cache:
		// no clone, so plugins keep one code path.
		pool =
			threads && WorkerPool.isThreadingAvailable()
				? new WorkerPool({
						max: getMaxThreads(threads.max),
						strictClone: true
					})
				: new WorkerPool({ max: 0 });
		pool.setKeepAlive(this._keepAlive);
		this._pool = pool;
		return pool;
	}
}

/**
 * @param {string | URL} workerPath absolute path or file URL
 * @returns {string} absolute path
 */
const normalizeWorkerPath = (workerPath) => {
	const module = fileUrlToPath(
		typeof workerPath === "string" ? workerPath : workerPath.href
	);
	if (!ABSOLUTE_PATH_REGEXP.test(module)) {
		throw new Error(`'workerPath' must be absolute, got '${module}'`);
	}
	return module;
};

/**
 * Threads for `threads.max`, counted as minimizer-webpack-plugin counts its `parallel` workers: one less than the cores, and never more.
 * @param {number | undefined} max the configured maximum; `undefined` takes every core but one
 * @returns {number} the thread count, never negative
 */
const getMaxThreads = (max) => {
	// `os.availableParallelism()` from Node 18.14; before, `os.cpus()`, which
	// can return undefined (https://github.com/nodejs/node/issues/19022)
	const cpus =
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		typeof os.availableParallelism === "function"
			? // eslint-disable-next-line n/no-unsupported-features/node-builtins
				os.availableParallelism()
			: (os.cpus() || { length: 1 }).length;
	const cores = Math.max(cpus - 1, 0);
	return max === undefined ? cores : Math.min(Math.floor(max), cores);
};

module.exports = WorkerFarm;
