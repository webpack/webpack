/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const os = require("os");
const path = require("path");
const WebpackError = require("../WebpackError");

/** @typedef {import("worker_threads").Worker} Worker */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../../declarations/WebpackOptions").ParallelLoaderOptions} ParallelLoaderOptions */

/** @typedef {typeof import("worker_threads")} WorkerThreads */

/**
 * `worker_threads` is unflagged from Node.js 12 on, so on the supported Node.js
 * 10 baseline (and on runtimes built without worker support) the require throws.
 * @type {WorkerThreads | undefined}
 */
let workerThreads;

try {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	workerThreads = require("worker_threads");
} catch (_err) {
	workerThreads = undefined;
}

const WORKER_PATH = path.join(__dirname, "ParallelLoaderWorker.js");

/**
 * @returns {boolean} true when this runtime can spawn `worker_threads` workers
 */
const isSupported = () => workerThreads !== undefined;

/**
 * `availableParallelism` (Node.js 18.4+) honours cgroup quotas and CPU affinity,
 * so it reports what the process may actually use; `cpus()` reports every host
 * core and can come back empty in containers.
 * @returns {number} how many threads this process can usefully run
 */
const getParallelism = () => {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	if (typeof os.availableParallelism === "function") {
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return os.availableParallelism();
	}
	const cpus = os.cpus();
	return cpus && cpus.length > 0 ? cpus.length : 1;
};

/**
 * @typedef {object} SerializedError
 * @property {string} name error name
 * @property {string} message error message
 * @property {string=} stack error stack
 * @property {string=} loaderPath loader that produced the error
 */

/**
 * Structured clone cannot carry a subclass, so errors cross the boundary as
 * plain data and are rebuilt here.
 * @param {SerializedError} data serialized error
 * @returns {Error} rebuilt error
 */
const deserializeError = (data) => {
	const error = new Error(data.message);
	error.name = data.name;
	if (data.stack) error.stack = data.stack;
	return error;
};

/**
 * @typedef {object} JobResult
 * @property {(string | Buffer | Uint8Array)[]} result loader result tuple
 * @property {boolean} cacheable is cacheable
 * @property {string[]} notCacheableReasons reasons the result is not cacheable
 * @property {string[]} fileDependencies file dependencies
 * @property {string[]} contextDependencies context dependencies
 * @property {string[]} missingDependencies missing dependencies
 * @property {string[]} buildDependencies build dependencies
 */

/** @typedef {(err: Error | null, result?: JobResult) => void} JobCallback */

/**
 * @typedef {object} Job
 * @property {EXPECTED_ANY} data payload sent to the worker
 * @property {EXPECTED_ANY} loaderContext originating loader context, used to answer RPC
 * @property {JobCallback} callback job callback
 */

/**
 * One `worker_threads` worker plus the jobs currently assigned to it.
 */
class PoolWorker {
	/**
	 * @param {WorkerPool} pool owning pool
	 */
	constructor(pool) {
		this.pool = pool;
		/** @type {Map<number, Job>} */
		this.jobs = new Map();
		this.nextJobId = 0;
		this.disposed = false;
		/**
		 * Ids of the values this worker already holds. Loader options are per-rule
		 * and the constants are per-compilation, so every module matched by a rule
		 * shares the same objects; sending them once instead of per job takes a
		 * deep clone off the main thread for each build.
		 * @type {Set<number>}
		 */
		this.knownShared = new Set();
		/** @type {Worker} */
		this.worker = new /** @type {WorkerThreads} */ (workerThreads).Worker(
			WORKER_PATH,
			{
				execArgv: pool.options.workerNodeArgs,
				stdout: false,
				stderr: false
			}
		);
		this.worker.on("message", (message) => {
			this._handleMessage(message);
		});
		this.worker.on("error", (err) => {
			this._fail(/** @type {Error} */ (err));
		});
		this.worker.on("exit", (code) => {
			if (!this.disposed && code !== 0) {
				this._fail(
					new WebpackError(
						`Parallel loader worker stopped unexpectedly with exit code ${code}`
					)
				);
			}
		});
		// an idle worker must not keep the process alive
		this.worker.unref();
	}

	/**
	 * @returns {number} number of jobs currently assigned
	 */
	get load() {
		return this.jobs.size;
	}

	/**
	 * @param {Job} job job to run
	 * @returns {void}
	 */
	run(job) {
		const id = this.nextJobId++;
		this.jobs.set(id, job);
		// only a worker with in-flight jobs may hold the event loop open
		this.worker.ref();

		/** @type {[number, EXPECTED_ANY][] | undefined} */
		let newShared;
		/**
		 * @param {EXPECTED_ANY} value value shared across jobs
		 * @returns {number} its id in the worker's registry
		 */
		const share = (value) => {
			const sharedId = this.pool.internShared(value);
			if (!this.knownShared.has(sharedId)) {
				this.knownShared.add(sharedId);
				if (newShared === undefined) newShared = [];
				newShared.push([sharedId, value]);
			}
			return sharedId;
		};

		const { loaders } = job.data;
		/** @type {EXPECTED_ANY[]} */
		let wireLoaders = loaders;

		for (let i = 0; i < loaders.length; i++) {
			const options = loaders[i].options;
			if (options === null || typeof options !== "object") continue;
			// copy before rewriting: the job's own descriptors must survive a
			// re-dispatch to a different worker
			if (wireLoaders === loaders) wireLoaders = [...loaders];
			wireLoaders[i] = {
				loader: loaders[i].loader,
				optionsId: share(options),
				ident: loaders[i].ident,
				type: loaders[i].type
			};
		}

		const constantsId = share(job.data.constants);

		try {
			this.worker.postMessage({
				type: "job",
				id,
				resource: job.data.resource,
				sourceMap: job.data.sourceMap,
				hot: job.data.hot,
				constantsId,
				loaders: wireLoaders,
				newShared
			});
		} catch (err) {
			// a non-cloneable value (e.g. a function in loader options) would
			// otherwise leave the job pending forever
			this.jobs.delete(id);
			if (this.jobs.size === 0) this.worker.unref();
			// the worker never received these, so don't claim it holds them
			if (newShared !== undefined) {
				for (const [sharedId] of newShared) this.knownShared.delete(sharedId);
			}
			this.pool.jobFinished();
			job.callback(
				new WebpackError(
					`Parallel loader job for ${job.data.resource} cannot be transferred to the worker: ${/** @type {Error} */ (err).message}`
				)
			);
		}
	}

	/**
	 * Fails every in-flight job. Used when the worker dies as a whole, where
	 * per-job replies will never arrive.
	 * @param {Error} err error to report
	 * @returns {void}
	 */
	_fail(err) {
		const jobs = [...this.jobs.values()];
		this.jobs.clear();
		this.worker.unref();
		this.pool.removeWorker(this);
		for (const job of jobs) job.callback(err);
	}

	/**
	 * @param {EXPECTED_ANY} message message from the worker
	 * @returns {void}
	 */
	_handleMessage(message) {
		const job = this.jobs.get(message.id);
		if (job === undefined) return;
		switch (message.type) {
			case "job-result": {
				this.jobs.delete(message.id);
				if (this.jobs.size === 0) this.worker.unref();
				this.pool.jobFinished();
				if (message.error) {
					job.callback(deserializeError(message.error));
				} else {
					job.callback(null, message.result);
				}
				break;
			}
			case "rpc":
				this._handleRpc(job, message);
				break;
		}
	}

	/**
	 * Answers a loader-context call the worker cannot service itself.
	 * @param {Job} job job the call belongs to
	 * @param {EXPECTED_ANY} message rpc message
	 * @returns {void}
	 */
	_handleRpc(job, message) {
		const { id, questionId, method, args } = message;
		/**
		 * @param {Error | null} err error
		 * @param {EXPECTED_ANY[]=} result result values
		 * @returns {void}
		 */
		const reply = (err, result) => {
			if (this.disposed) return;
			this.worker.postMessage({
				type: "rpc-result",
				id,
				questionId,
				error: err
					? { name: err.name, message: err.message, stack: err.stack }
					: undefined,
				result
			});
		};
		const loaderContext = job.loaderContext;
		switch (method) {
			case "resolve": {
				const [context, request, resolveOptions] = args;
				const resolve = resolveOptions
					? loaderContext.getResolve(resolveOptions)
					: loaderContext.resolve.bind(loaderContext);
				resolve(
					context,
					request,
					/**
					 * @param {Error | null} err error
					 * @param {string | false=} result resolved request
					 * @returns {void}
					 */
					(err, result) => reply(err, [result])
				);
				break;
			}
			case "emitWarning":
				loaderContext.emitWarning(deserializeError(args[0]));
				reply(null);
				break;
			case "emitError":
				loaderContext.emitError(deserializeError(args[0]));
				reply(null);
				break;
			case "log": {
				const [name, level, logArgs] = args;
				const logger = loaderContext.getLogger(name);
				if (typeof logger[level] === "function") logger[level](...logArgs);
				reply(null);
				break;
			}
			case "loadModule":
				loaderContext.loadModule(
					args[0],
					/**
					 * @param {Error | null} err error
					 * @param {string=} source source
					 * @param {EXPECTED_ANY=} sourceMap source map
					 * @returns {void}
					 */
					(err, source, sourceMap) => reply(err, [source, sourceMap])
				);
				break;
			case "importModule":
				loaderContext.importModule(
					args[0],
					args[1],
					/**
					 * @param {Error | null} err error
					 * @param {EXPECTED_ANY=} exports module exports
					 * @returns {void}
					 */
					(err, exports) => {
						if (err) return reply(err);
						try {
							reply(null, [exports]);
						} catch (_cloneError) {
							reply(
								new WebpackError(
									`importModule("${args[0]}") returned a value that cannot be transferred to a parallel loader worker`
								)
							);
						}
					}
				);
				break;
			default:
				reply(
					new WebpackError(`Unknown parallel loader worker request "${method}"`)
				);
		}
	}

	/**
	 * @returns {Promise<void>} resolves once the worker has stopped
	 */
	dispose() {
		this.disposed = true;
		return Promise.resolve(this.worker.terminate()).then(() => undefined);
	}
}

/**
 * A pool of `worker_threads` workers running loader chains off the main thread.
 */
class WorkerPool {
	/**
	 * @param {ParallelLoaderOptions} options pool options
	 */
	constructor(options) {
		this.options = {
			workers:
				options.workers !== undefined
					? options.workers
					: Math.max(1, getParallelism() - 1),
			workerParallelJobs:
				options.workerParallelJobs !== undefined
					? options.workerParallelJobs
					: 20,
			workerNodeArgs: options.workerNodeArgs,
			poolTimeout: options.poolTimeout !== undefined ? options.poolTimeout : 500
		};
		/** @type {PoolWorker[]} */
		this.workers = [];
		/** @type {Job[]} */
		this.queue = [];
		this.disposed = false;
		/** @type {NodeJS.Timeout | undefined} */
		this.idleTimer = undefined;
		/**
		 * Identity map for values that repeat across jobs (loader options, the
		 * per-compilation constants). Weak so a discarded rule set does not pin
		 * its options for the life of the compiler.
		 * @type {WeakMap<EXPECTED_OBJECT, number>}
		 */
		this.sharedIds = new WeakMap();
		this.nextSharedId = 0;
	}

	/**
	 * @param {EXPECTED_ANY} value value shared across jobs
	 * @returns {number} a stable id for this exact object
	 */
	internShared(value) {
		let id = this.sharedIds.get(value);
		if (id === undefined) {
			id = this.nextSharedId++;
			this.sharedIds.set(value, id);
		}
		return id;
	}

	/**
	 * @param {EXPECTED_ANY} data payload for the worker
	 * @param {EXPECTED_ANY} loaderContext originating loader context
	 * @param {JobCallback} callback called with the loader result
	 * @returns {void}
	 */
	run(data, loaderContext, callback) {
		if (this.disposed) {
			return callback(
				new WebpackError("Parallel loader pool was already disposed")
			);
		}
		if (this.idleTimer !== undefined) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}
		this._dispatch({ data, loaderContext, callback });
	}

	/**
	 * @param {Job} job job to dispatch or queue
	 * @returns {void}
	 */
	_dispatch(job) {
		const worker = this._acquireWorker();
		if (worker === undefined) {
			this.queue.push(job);
			return;
		}
		worker.run(job);
	}

	/**
	 * Picks the least loaded worker below the per-worker job limit, spawning a
	 * new one first while the pool is not yet at full size.
	 * @returns {PoolWorker | undefined} a worker with spare capacity
	 */
	_acquireWorker() {
		/** @type {PoolWorker | undefined} */
		let best;
		for (const worker of this.workers) {
			if (worker.load >= this.options.workerParallelJobs) continue;
			if (best === undefined || worker.load < best.load) best = worker;
		}
		if (best !== undefined && best.load === 0) return best;
		if (this.workers.length < this.options.workers) {
			const worker = new PoolWorker(this);
			this.workers.push(worker);
			return worker;
		}
		return best;
	}

	/**
	 * @returns {void}
	 */
	jobFinished() {
		const job = this.queue.shift();
		if (job !== undefined) {
			this._dispatch(job);
			return;
		}
		if (this.queue.length === 0 && this._isIdle()) this._scheduleIdleDispose();
	}

	/**
	 * @returns {boolean} true when no worker has work left
	 */
	_isIdle() {
		for (const worker of this.workers) {
			if (worker.load > 0) return false;
		}
		return true;
	}

	/**
	 * Idle workers are torn down after `poolTimeout` so a watch-mode build does
	 * not hold threads (and their heaps) between rebuilds.
	 * @returns {void}
	 */
	_scheduleIdleDispose() {
		if (this.disposed || this.options.poolTimeout <= 0) return;
		if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			this.idleTimer = undefined;
			if (!this._isIdle()) return;
			const workers = this.workers;
			this.workers = [];
			for (const worker of workers) worker.dispose();
		}, this.options.poolTimeout);
		if (typeof this.idleTimer.unref === "function") this.idleTimer.unref();
	}

	/**
	 * @param {PoolWorker} worker worker to drop
	 * @returns {void}
	 */
	removeWorker(worker) {
		const index = this.workers.indexOf(worker);
		if (index >= 0) this.workers.splice(index, 1);
	}

	/**
	 * @returns {Promise<void>} resolves once every worker has stopped
	 */
	dispose() {
		this.disposed = true;
		if (this.idleTimer !== undefined) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}
		const workers = this.workers;
		this.workers = [];
		this.queue.length = 0;
		return Promise.all(workers.map((worker) => worker.dispose())).then(
			() => undefined
		);
	}
}

/** @type {WeakMap<Compiler, WorkerPool>} */
const pools = new WeakMap();

/**
 * Keyed by the root compiler so child compilations (which get their own
 * `Compiler`) share the parent's pool instead of spawning a second one.
 * @param {Compiler} compiler compiler the pool belongs to
 * @returns {WorkerPool | undefined} the pool registered for this compiler
 */
const getWorkerPool = (compiler) => pools.get(compiler.root);

/**
 * @param {Compiler} compiler compiler the pool belongs to
 * @param {WorkerPool} pool pool to register
 * @returns {void}
 */
const setWorkerPool = (compiler, pool) => {
	pools.set(compiler.root, pool);
};

module.exports.WorkerPool = WorkerPool;
module.exports.deserializeError = deserializeError;
module.exports.getWorkerPool = getWorkerPool;
module.exports.isSupported = isSupported;
module.exports.setWorkerPool = setWorkerPool;
