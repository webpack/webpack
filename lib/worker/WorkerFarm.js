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
 * created lazily. `Compiler` holds it only while `experiments.threads` is on.
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
		if (!threads) throw new Error("experiments.threads is off");
		const loaders = threads.loaders;
		pool = new WorkerPool({
			max:
				threads.max === undefined ? getDefaultMax() : Math.floor(threads.max),
			strictClone: true,
			loaderPoolTimeout:
				loaders === undefined ? undefined : loaders.poolTimeout,
			loaderParallelJobs:
				loaders === undefined ? undefined : loaders.parallelJobs
		});
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
 * @returns {number} one less than the CPU count, never negative
 */
const getDefaultMax = () => {
	const cpus =
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		typeof os.availableParallelism === "function"
			? // eslint-disable-next-line n/no-unsupported-features/node-builtins
				os.availableParallelism()
			: (os.cpus() || { length: 1 }).length;
	return Math.max(cpus - 1, 0);
};

module.exports = WorkerFarm;
