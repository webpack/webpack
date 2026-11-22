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
 * The threaded pool every compiler of the process shares, and the farms using it.
 * @typedef {object} SharedPool
 * @property {WorkerPool} pool the pool
 * @property {Set<WorkerFarm>} farms the farms using it; the last to end ends the pool
 */

/**
 * WHY: cores are a process-wide budget. A MultiCompiler runs its compilers at
 * once, and per-compiler pools would start cores - 1 threads for each.
 * @type {SharedPool | undefined}
 */
let sharedPool;

const PLUGIN_NAME = "WorkerFarm";

/**
 * The compiler's worker resource: its pools and one facade per pool and module
 * path, created lazily. Calls run on the shared threaded pool when
 * `experiments.threads` is on, or when it is off and the caller asks for
 * threads with `numWorkers`; otherwise they run inline.
 */
class WorkerFarm {
	/**
	 * @param {Compiler} compiler the root compiler
	 */
	constructor(compiler) {
		/** @type {Compiler} */
		this._compiler = compiler;
		/** @type {WorkerPool | undefined} */
		this._inline = undefined;
		/** @type {SharedPool | undefined} */
		this._shared = undefined;
		/** @type {Map<WorkerPool, Map<string, Worker>>} */
		this._workers = new Map();
		/** @type {Promise<void> | undefined} */
		this._ending = undefined;
		this._closed = false;
		this._keepAlive = false;
		this._building = false;
		// WHY: a build hands its threads from loaders to minimizers with idle
		// gaps between (seal can outlast an idle timeout), and a watch rebuild
		// may come minutes later; spawning a thread costs far more than a call.
		// The farm taps the hooks itself: `numWorkers` threads run without
		// `experiments.threads`, so without `WorkerPlugin`.
		compiler.hooks.compile.tap(PLUGIN_NAME, () => this.startBuild());
		const endBuild = () => this.endBuild(compiler.watchMode);
		compiler.hooks.done.tap(PLUGIN_NAME, endBuild);
		compiler.hooks.failed.tap(PLUGIN_NAME, endBuild);
		compiler.hooks.watchClose.tap(PLUGIN_NAME, () => this.setKeepAlive(false));
		// created mid-build, e.g. by a minimizer in `processAssets`
		if (compiler.running) this.startBuild();
	}

	/**
	 * The pool `experiments.threads` configures, or `undefined` once the farm is closing.
	 * @returns {WorkerPool | undefined} the pool
	 */
	getPool() {
		if (this._closed) return undefined;
		return this._getPool(undefined);
	}

	/**
	 * One facade per pool and module path. Once the farm closes, a facade made
	 * before keeps being returned; its calls reject through the ended pool.
	 * @param {string | URL} workerPath absolute path or file URL
	 * @param {WorkerOptions=} options options
	 * @returns {Worker} the facade
	 */
	getWorker(workerPath, options) {
		const module = normalizeWorkerPath(workerPath);
		const numWorkers = options === undefined ? undefined : options.numWorkers;
		if (
			numWorkers !== undefined &&
			(typeof numWorkers !== "number" || !(numWorkers >= 0))
		) {
			throw new TypeError(
				`'numWorkers' must be a non-negative number, got ${String(numWorkers)}`
			);
		}
		const pool = this._closed
			? this._peekPool(numWorkers)
			: this._getPool(numWorkers);
		const workers = pool && this._workers.get(pool);
		let worker = workers && workers.get(module);
		if (worker !== undefined) return worker;
		if (this._closed || pool === undefined) {
			throw new Error(
				"compiler.worker() cannot create a worker after compiler.close()"
			);
		}
		worker = new (require("./Worker"))(pool, module, options);
		if (workers === undefined) {
			this._workers.set(pool, new Map([[module, worker]]));
		} else {
			workers.set(module, worker);
		}
		return worker;
	}

	/**
	 * Keeps the pools' idle threads alive, e.g. for the length of a build; applies to a pool created later too.
	 * @param {boolean} keepAlive whether idle threads stay alive
	 * @returns {void}
	 */
	setKeepAlive(keepAlive) {
		this._keepAlive = keepAlive;
		if (this._shared !== undefined) {
			this._shared.pool.setKeepAlive(this._anyKeepAlive());
		}
		if (this._inline !== undefined) this._inline.setKeepAlive(keepAlive);
	}

	/**
	 * A shared pool stays alive while any farm using it does.
	 * @returns {boolean} whether the shared pool's idle threads stay alive
	 */
	_anyKeepAlive() {
		if (this._shared === undefined) return this._keepAlive;
		for (const farm of this._shared.farms) {
			if (farm._keepAlive) return true;
		}
		return false;
	}

	/**
	 * Starts a build: idle threads stay alive until it ends.
	 * @returns {void}
	 */
	startBuild() {
		this._building = true;
		this.setKeepAlive(true);
	}

	/**
	 * Ends a build. Watching, the threads stay alive for the next one, except those that ran nothing since the previous build ended; otherwise their idle timers start.
	 * @param {boolean} watching whether a rebuild may follow
	 * @returns {void}
	 */
	endBuild(watching) {
		this._building = false;
		this.setKeepAlive(watching);
		const shared = this._shared;
		if (shared === undefined || this._othersBuilding()) return;
		// the last build of a round trims: an earlier one would retire threads
		// a sibling compiler used before that build ended
		if (watching) shared.pool.releaseUnused();
		shared.pool.markUnused();
	}

	/**
	 * @returns {boolean} whether another compiler of the shared pool is mid-build
	 */
	_othersBuilding() {
		if (this._shared === undefined) return false;
		for (const farm of this._shared.farms) {
			if (farm !== this && farm._building) return true;
		}
		return false;
	}

	/**
	 * Marks the farm closing without ending the pools; `end()` does both.
	 * @returns {void}
	 */
	close() {
		this._closed = true;
	}

	/**
	 * Marks the farm closed and ends its pools once; the shared pool ends with the last farm using it.
	 * @returns {Promise<void>} settled when every thread exited
	 */
	end() {
		this._closed = true;
		if (this._ending !== undefined) return this._ending;
		/** @type {Promise<void>[]} */
		const ending = [];
		if (this._inline !== undefined) ending.push(this._inline.end());
		const shared = this._shared;
		if (shared !== undefined) {
			shared.farms.delete(this);
			this._keepAlive = false;
			if (shared.farms.size > 0) {
				// other compilers still use the threads
				shared.pool.setKeepAlive(this._anyKeepAlive());
			} else {
				if (sharedPool === shared) sharedPool = undefined;
				ending.push(shared.pool.end());
			}
		}
		this._ending = Promise.all(ending).then(() => {});
		return this._ending;
	}

	/**
	 * Which pool a call goes to, as `[threads, strict]`: `threads > 0` is the shared pool.
	 * @param {number | undefined} numWorkers the caller's thread count
	 * @returns {[number, boolean]} thread count and whether inline calls check clones
	 */
	_select(numWorkers) {
		const WorkerPool = require("./WorkerPool");

		const threaded = WorkerPool.isThreadingAvailable();
		const { threads } = this._compiler.options.experiments;
		if (threads) {
			// configured: `numWorkers` is ignored; `max: 0` runs inline with the
			// threads' clone checks
			return threaded ? [getMaxThreads(threads.max), true] : [0, false];
		}
		// Threads off is a plain call on the main thread, like a disabled cache:
		// no clone, so plugins keep one code path. `numWorkers` asks for threads
		// anyway, for work that ran on jest-worker before.
		if (numWorkers === undefined || !threaded) return [0, false];
		return [getMaxThreads(numWorkers), false];
	}

	/**
	 * @param {number | undefined} numWorkers the caller's thread count
	 * @returns {WorkerPool | undefined} the pool a call goes to, if created already
	 */
	_peekPool(numWorkers) {
		const [max] = this._select(numWorkers);
		return max > 0 ? this._shared && this._shared.pool : this._inline;
	}

	/**
	 * @param {number | undefined} numWorkers the caller's thread count
	 * @returns {WorkerPool} the pool a call goes to
	 */
	_getPool(numWorkers) {
		const WorkerPool = require("./WorkerPool");

		const [max, strictClone] = this._select(numWorkers);
		if (max === 0) {
			if (this._inline === undefined) {
				this._inline = new WorkerPool({ max: 0, strictClone });
				this._inline.setKeepAlive(this._keepAlive);
			}
			return this._inline;
		}
		let shared = this._shared;
		if (shared === undefined) {
			shared = sharedPool;
			if (shared === undefined || shared.pool.ending) {
				shared = sharedPool = {
					pool: new WorkerPool({ max, strictClone: true }),
					farms: new Set()
				};
			}
			shared.farms.add(this);
			this._shared = shared;
			shared.pool.setKeepAlive(this._anyKeepAlive());
		}
		if (max > shared.pool.options.max) shared.pool.options.max = max;
		return shared.pool;
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
