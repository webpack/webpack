/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const os = require("os");
const v8 = require("v8");
const WorkerJobCloneError = require("../errors/WorkerJobCloneError");
const ArrayQueue = require("../util/ArrayQueue");
const { ABSOLUTE_PATH_REGEXP, fileUrlToPath } = require("../util/identifier");
const {
	WORKER_DATA_KIND,
	decodeError,
	encodeError,
	toError
} = require("./protocol");

/** @typedef {import("worker_threads")} WorkerThreads */
/** @typedef {import("worker_threads").Worker} WorkerThread */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./Worker")} Worker */
/** @typedef {import("./Worker").WorkerOptions} WorkerOptions */
/** @typedef {import("./protocol").JobMessage} JobMessage */
/** @typedef {import("./protocol").PreloadMessage} PreloadMessage */
/** @typedef {import("./protocol").ResponseMessage} ResponseMessage */
/** @typedef {import("./protocol").RpcMessage} RpcMessage */
/** @typedef {import("./protocol").WorkerData} WorkerData */

/**
 * `worker_threads` needs `--experimental-worker` on Node 10; the flag was removed in Node 11.7.
 * @type {WorkerThreads | undefined}
 */
let workerThreads;
try {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	workerThreads = require("worker_threads");
} catch (_err) {
	workerThreads = undefined;
}

/**
 * A handler a worker calls on the main thread while a job runs.
 * @typedef {(method: string, args: unknown[]) => unknown | Promise<unknown>} RpcHandler
 */

/**
 * @typedef {object} WorkerPoolOptions
 * @property {number} max upper bound of threads; `0` runs every call inline
 * @property {number} idleTimeout milliseconds an idle thread survives after a plain call
 * @property {number} loaderPoolTimeout milliseconds an idle thread survives after a loader job
 * @property {number} loaderParallelJobs jobs a thread may run at once for loader work
 * @property {boolean} strictClone clone arguments and results on the inline path
 */

/**
 * A call waiting for, or in flight on, a thread.
 * @typedef {object} PendingCall
 * @property {number} id echoed by the response
 * @property {string} module absolute path of the module
 * @property {string} method name of the export to call
 * @property {unknown[]} args arguments after the module
 * @property {"call" | "loader"} type whether the child passes an RPC context
 * @property {number} parallelJobs calls allowed beside this one on one thread
 * @property {boolean} blocked whether the job waits on a main-thread build
 * @property {RpcHandler | undefined} rpc handler for the job's main-thread calls
 * @property {(value: unknown) => void} resolve settles the caller
 * @property {(error: Error) => void} reject settles the caller
 */

/**
 * @typedef {object} RunJobOptions
 * @property {RpcHandler=} rpc handler for a loader job's main-thread calls
 * @property {number=} parallelJobs calls allowed beside this job on one thread
 */

/**
 * A preload waiting for its acknowledgement.
 * @typedef {object} PendingPreload
 * @property {(error?: Error) => void} resolve settles the caller
 */

/**
 * The pool's record of one thread.
 * @typedef {object} PoolWorker
 * @property {number} id id given in `workerData`
 * @property {WorkerThread} thread Node's thread handle
 * @property {"idle" | "busy" | "exiting" | "exited"} state current state
 * @property {Map<number, PendingCall>} calls calls in flight by id
 * @property {"call" | "loader" | undefined} lastJobType kind of the last job
 * @property {Map<number, PendingPreload>} preloads pending preloads by id
 * @property {NodeJS.Timeout | undefined} idleTimer runs while the worker is idle
 * @property {Error | undefined} error what the thread threw before exiting
 * @property {boolean} releaseWhenIdle retire the worker once its calls settle
 * @property {boolean} closeWhenIdle close the worker once its calls settle
 * @property {(() => void)[]} exitWaiters resolved when the thread exits
 */

/**
 * @typedef {object} PoolStats
 * @property {number} workers live threads
 * @property {number} idle threads with nothing in flight
 * @property {number} queued calls waiting for a thread
 * @property {number} running calls in flight, remote and inline
 * @property {number} completed calls settled since the pool was created
 * @property {number} spawned threads started since the pool was created
 * @property {number} crashed threads that exited with a call in flight
 */

/**
 * @typedef {(workerPath: string | URL, options?: WorkerOptions) => Worker} WorkerFactory
 */

/** @type {Required<WorkerPoolOptions>} */
const DEFAULT_OPTIONS = {
	max: 0,
	idleTimeout: 30000,
	loaderPoolTimeout: 500,
	loaderParallelJobs: 20,
	strictClone: false
};

/**
 * Copies a value the way `postMessage` would, so the inline path fails on the same values the remote path does.
 * @template T
 * @param {T} value the value
 * @returns {T} its copy
 */
const cloneValue = (value) => v8.deserialize(v8.serialize(value));

/**
 * Terminates a thread on both the callback and Promise forms of `terminate`.
 * @param {WorkerThread} thread the thread
 * @returns {Promise<void>} settled when the thread was asked to stop
 */
const terminateThread = (thread) =>
	new Promise((resolve) => {
		try {
			const terminate =
				/** @type {(callback?: () => void) => Promise<number> | undefined} */ (
					/** @type {unknown} */ (thread.terminate.bind(thread))
				);
			const result = terminate(() => resolve());
			if (result && typeof result.then === "function") {
				result.then(
					() => resolve(),
					() => resolve()
				);
			}
		} catch (_err) {
			resolve();
		}
	});

/**
 * Whether a failed `postMessage` means the value cannot be structured-cloned.
 * Node throws a `DataCloneError`; Deno and Bun throw their own error type and
 * only the message says why.
 * @param {ThrownValue} error what `postMessage` threw
 * @returns {boolean} whether the value could not be cloned
 */
const isCloneError = (error) => {
	if (typeof error !== "object" || error === null) return false;
	if (/** @type {{ name?: unknown }} */ (error).name === "DataCloneError") {
		return true;
	}
	const { message } = /** @type {{ message?: unknown }} */ (error);
	return (
		typeof message === "string" &&
		/(?:can ?not|could not) be cloned/i.test(message)
	);
};

/**
 * @returns {Error} the error a call rejects with once the pool is ending
 */
const createEndingError = () => new Error("The worker pool is ending");

/**
 * A pool of threads that runs CommonJS module methods. A thread runs one plain call at a time and may run several loader jobs; without `worker_threads`, or with `max: 0`, every call runs inline.
 */
class WorkerPool {
	/**
	 * @param {Partial<WorkerPoolOptions>=} options options
	 */
	constructor(options) {
		const merged = { ...DEFAULT_OPTIONS, ...options };
		/**
		 * @param {number} value the value
		 * @param {number} fallback the default
		 * @returns {number} a finite value
		 */
		const number = (value, fallback) =>
			typeof value === "number" && Number.isFinite(value) ? value : fallback;
		/** @type {Required<WorkerPoolOptions>} */
		this.options = {
			max: Math.max(Math.floor(number(merged.max, DEFAULT_OPTIONS.max)), 0),
			idleTimeout: number(merged.idleTimeout, DEFAULT_OPTIONS.idleTimeout),
			loaderPoolTimeout: number(
				merged.loaderPoolTimeout,
				DEFAULT_OPTIONS.loaderPoolTimeout
			),
			loaderParallelJobs: Math.max(
				Math.floor(
					number(merged.loaderParallelJobs, DEFAULT_OPTIONS.loaderParallelJobs)
				),
				1
			),
			strictClone: merged.strictClone === true
		};
		/** @type {Set<PoolWorker>} */
		this._workers = new Set();
		/** @type {PoolWorker[]} */
		this._idleWorkers = [];
		/** @type {ArrayQueue<PendingCall>} */
		this._queue = new ArrayQueue();
		/** @type {PendingCall | undefined} */
		this._pending = undefined;
		/** @type {Map<string, Promise<Record<string, unknown>>>} */
		this._inlineModules = new Map();
		/** @type {number} */
		this._inlineRunning = 0;
		/** @type {number} */
		this._nextWorkerId = 1;
		/** @type {number} */
		this._nextCallId = 1;
		/** @type {number} */
		this._nextPreloadId = 1;
		/** @type {Promise<void> | undefined} */
		this._ending = undefined;
		/** @type {(() => void) | undefined} */
		this._resolveEnding = undefined;
		/** @type {NodeJS.Timeout | undefined} */
		this._endingTimer = undefined;
		/** @type {number} */
		this._completed = 0;
		/** @type {number} */
		this._spawned = 0;
		/** @type {number} */
		this._crashed = 0;
	}

	/**
	 * @returns {boolean} whether this Node can spawn threads at all
	 */
	static isThreadingAvailable() {
		return (
			workerThreads !== undefined && typeof workerThreads.Worker === "function"
		);
	}

	/**
	 * Runs one method of one module, on a thread when possible.
	 * @param {string} module absolute path of the module
	 * @param {string} method name of the export to call
	 * @param {unknown[]} args arguments after the module
	 * @returns {Promise<unknown>} what the method returned
	 */
	run(module, method, args) {
		return this.runJob(module, method, args);
	}

	/**
	 * Runs one method of one module and, for loader jobs, routes the worker's main-thread calls through `options.rpc`.
	 * @param {string} module absolute path of the module
	 * @param {string} method name of the export to call
	 * @param {unknown[]} args arguments after the module
	 * @param {RunJobOptions=} options job options
	 * @returns {Promise<unknown>} what the method returned
	 */
	runJob(module, method, args, options) {
		const rpc = options === undefined ? undefined : options.rpc;
		const requestedParallelJobs =
			options === undefined ? undefined : options.parallelJobs;
		const parallelJobs =
			requestedParallelJobs !== undefined &&
			Number.isFinite(requestedParallelJobs)
				? Math.max(Math.floor(requestedParallelJobs), 1)
				: rpc === undefined
					? 1
					: this.options.loaderParallelJobs;
		if (this._ending !== undefined) return Promise.reject(createEndingError());
		if (this.options.max === 0 || !WorkerPool.isThreadingAvailable()) {
			return this._runInline(module, method, args, rpc);
		}
		return new Promise((resolve, reject) => {
			/** @type {PendingCall} */
			const call = {
				id: this._nextCallId++,
				module,
				method,
				args,
				type: rpc === undefined ? "call" : "loader",
				parallelJobs,
				blocked: false,
				rpc,
				resolve,
				reject
			};
			this._queue.enqueue(call);
			this._dispatch();
		});
	}

	/**
	 * Spawns up to `workers` threads and preloads the modules in each.
	 * @param {string[]} modules absolute paths
	 * @param {number=} workers number of threads to reach; defaults to `max`
	 * @returns {Promise<void>} settled when every targeted thread loaded the modules
	 */
	warmup(modules, workers) {
		if (this._ending !== undefined) {
			return Promise.reject(createEndingError());
		}
		if (this.options.max === 0 || !WorkerPool.isThreadingAvailable()) {
			return Promise.resolve();
		}
		const requested = workers === undefined ? this.options.max : workers;
		const target = Number.isFinite(requested)
			? Math.min(Math.max(Math.floor(requested), 0), this.options.max)
			: this.options.max;
		if (target === 0) return Promise.resolve();
		/** @type {Promise<void>[]} */
		const preloads = [];
		let usable = 0;
		for (const worker of this._workers) {
			if (worker.state === "exiting" || worker.state === "exited") continue;
			usable++;
			preloads.push(this._preload(worker, modules));
		}
		/** @type {PoolWorker[]} */
		const spawned = [];
		while (usable < target) {
			try {
				const worker = this._spawn();
				usable++;
				spawned.push(worker);
				preloads.push(this._preload(worker, modules));
			} catch (error) {
				for (const preload of preloads) preload.catch(() => {});
				return Promise.all(
					spawned.map((worker) => this._terminate(worker))
				).then(() => {
					throw toError(error);
				});
			}
		}
		return Promise.all(preloads).then(() => {});
	}

	/**
	 * Releases idle threads. Calls in flight finish, then their threads retire; the pool stays usable.
	 * @returns {Promise<void>} settled when the idle threads exited
	 */
	release() {
		/** @type {Promise<void>[]} */
		const promises = [];
		for (const worker of this._workers) {
			promises.push(this._waitForExit(worker));
			worker.releaseWhenIdle = true;
			if (worker.calls.size === 0 && worker.preloads.size === 0) {
				this._retire(worker);
			}
		}
		return Promise.all(promises).then(() => {});
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @returns {Promise<void>} settled when the thread exits
	 */
	_waitForExit(worker) {
		if (worker.state === "exited") return Promise.resolve();
		return new Promise((resolve) => {
			worker.exitWaiters.push(resolve);
		});
	}

	/**
	 * Ends the pool. Queued calls reject; in-flight calls finish until the deadline, then their threads are terminated.
	 * @param {{ force?: boolean }=} options options
	 * @returns {Promise<void>} settled when every thread exited
	 */
	end(options) {
		if (this._ending !== undefined) return this._ending;
		this._ending = new Promise((resolve) => {
			this._resolveEnding = resolve;
		});
		const force = options !== undefined && options.force === true;
		if (this._pending !== undefined) {
			this._pending.reject(createEndingError());
			this._pending = undefined;
		}
		for (
			let call = this._queue.dequeue();
			call !== undefined;
			call = this._queue.dequeue()
		) {
			call.reject(createEndingError());
		}
		for (const worker of this._workers) {
			// An idle thread does not hold the process by itself; `end()` must.
			worker.thread.ref();
			if (force) {
				this._terminate(worker);
			} else if (worker.calls.size === 0 && worker.preloads.size === 0) {
				this._close(worker);
			} else {
				worker.closeWhenIdle = true;
			}
		}
		if (this._workers.size > 0) {
			// WHY: The deadline keeps the process alive until stuck threads are terminated.
			this._endingTimer = setTimeout(() => {
				for (const worker of this._workers) this._terminate(worker);
			}, 1000);
		}
		this._finishEnding();
		return this._ending;
	}

	/**
	 * @returns {PoolStats} counts
	 */
	get stats() {
		let idle = 0;
		let running = this._inlineRunning;
		for (const worker of this._workers) {
			if (worker.calls.size === 0 && worker.preloads.size === 0) idle++;
			running += worker.calls.size;
		}
		return {
			workers: this._workers.size,
			idle,
			queued: this._queue.length + (this._pending === undefined ? 0 : 1),
			running,
			completed: this._completed,
			spawned: this._spawned,
			crashed: this._crashed
		};
	}

	/**
	 * Runs one call inline, with the same module cache and clone checks.
	 * @param {string} module absolute path of the module
	 * @param {string} method name of the export to call
	 * @param {unknown[]} args arguments after the module
	 * @param {RpcHandler | undefined} rpc handler for a loader job
	 * @returns {Promise<unknown>} what the method returned
	 */
	async _runInline(module, method, args, rpc) {
		this._inlineRunning++;
		try {
			const loaded = await this._loadInline(module);
			const fn = /** @type {(...args: unknown[]) => unknown} */ (
				loaded[method]
			);
			if (typeof fn !== "function") {
				throw new Error(`${module} has no export named ${method}`);
			}
			/** @type {unknown[]} */
			let values;
			try {
				values = this.options.strictClone ? cloneValue(args) : args;
			} catch (error) {
				throw isCloneError(error)
					? new WorkerJobCloneError(
							/** @type {{ message: string }} */ (error).message
						)
					: toError(error);
			}
			try {
				const value =
					rpc === undefined
						? await fn(...values)
						: await fn(
								{
									workerId: 0,
									callMain: (
										/** @type {string} */ name,
										/** @type {unknown[]} */ args
									) => Promise.resolve().then(() => rpc(name, args)),
									callMainNoWait: (
										/** @type {string} */ name,
										/** @type {unknown[]} */ args
									) => {
										Promise.resolve()
											.then(() => rpc(name, args))
											.catch(() => {});
									}
								},
								...values
							);
				return this.options.strictClone ? cloneValue(value) : value;
			} catch (error) {
				throw toError(error);
			}
		} finally {
			this._inlineRunning--;
			this._completed++;
			this._finishEnding();
		}
	}

	/**
	 * Requires a module on the main thread once.
	 * @param {string} module absolute path
	 * @returns {Promise<Record<string, unknown>>} the module
	 */
	_loadInline(module) {
		let loaded = this._inlineModules.get(module);
		if (loaded === undefined) {
			loaded = Promise.resolve().then(() => require(module));
			this._inlineModules.set(module, loaded);
		}
		return loaded;
	}

	/**
	 * Hands queued calls to threads with capacity, spawning while the pool is below `max`.
	 * @returns {void}
	 */
	_dispatch() {
		if (this._ending !== undefined) return;
		while (true) {
			if (this._pending === undefined) {
				this._pending = this._queue.dequeue();
				if (this._pending === undefined) return;
			}
			let worker = this._findWorker(
				this._pending,
				this._workers.size < this.options.max
			);
			if (worker === undefined) {
				if (this._workers.size >= this.options.max) return;
				try {
					worker = this._spawn();
				} catch (error) {
					const call = this._pending;
					this._pending = undefined;
					call.reject(toError(error));
					continue;
				}
			}
			const call = this._pending;
			this._pending = undefined;
			this._send(worker, call);
		}
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @returns {boolean} whether every call waits on the main thread
	 */
	_isBlocked(worker) {
		if (worker.calls.size === 0) return false;
		for (const call of worker.calls.values()) {
			if (!call.blocked) return false;
		}
		return true;
	}

	/**
	 * @param {PendingCall} call the call
	 * @param {boolean} spawnAllowed whether `_dispatch` may still spawn another thread
	 * @returns {PoolWorker | undefined} a thread with capacity
	 */
	_findWorker(call, spawnAllowed) {
		for (let i = this._idleWorkers.length - 1; i >= 0; i--) {
			const worker = this._idleWorkers[i];
			if (worker.state !== "idle" || !this._workers.has(worker)) {
				this._idleWorkers.splice(i, 1);
				continue;
			}
			if (worker.calls.size !== 0) continue;
			this._idleWorkers.splice(i, 1);
			if (worker.idleTimer !== undefined) {
				clearTimeout(worker.idleTimer);
				worker.idleTimer = undefined;
			}
			return worker;
		}
		for (const worker of this._workers) {
			if (worker.state !== "busy") continue;
			if (!this._isBlocked(worker)) continue;
			return worker;
		}
		// Below `max`, another thread starts instead of packing jobs into this
		// one: `parallelJobs` only widens a thread at saturation, as in
		// thread-loader. Spawning early keeps a burst on all cores.
		if (spawnAllowed || call.type !== "loader") return undefined;
		// At `max`, pick the thread with the fewest running loader jobs so the
		// burst spreads evenly; iterating `_workers` would fill the first one to
		// `parallelJobs` before touching the rest.
		/** @type {PoolWorker | undefined} */
		let best;
		let bestActive = Infinity;
		for (const worker of this._workers) {
			if (worker.state !== "idle" && worker.state !== "busy") continue;
			let limit = call.parallelJobs;
			let active = 0;
			let allowed = true;
			for (const inFlight of worker.calls.values()) {
				if (inFlight.type !== "loader") {
					allowed = false;
					break;
				}
				if (inFlight.parallelJobs < limit) limit = inFlight.parallelJobs;
				if (!inFlight.blocked) active++;
			}
			if (!allowed || active >= limit || active >= bestActive) continue;
			best = worker;
			bestActive = active;
		}
		if (best === undefined) return undefined;
		this._removeIdle(best);
		if (best.idleTimer !== undefined) {
			clearTimeout(best.idleTimer);
			best.idleTimer = undefined;
		}
		return best;
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {PendingCall} call the call
	 * @returns {void}
	 */
	_send(worker, call) {
		this._removeIdle(worker);
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		worker.state = "busy";
		worker.lastJobType = call.type;
		worker.calls.set(call.id, call);
		worker.thread.ref();
		/** @type {JobMessage} */
		const message = {
			type: "job",
			id: call.id,
			module: call.module,
			method: call.method,
			args: call.args,
			rpc: call.type === "loader"
		};
		try {
			worker.thread.postMessage(message);
		} catch (error) {
			worker.calls.delete(call.id);
			const normalized = toError(error);
			if (isCloneError(error)) {
				call.reject(
					new WorkerJobCloneError(
						/** @type {{ message: string }} */ (error).message
					)
				);
			} else {
				call.reject(normalized);
			}
			if (worker.calls.size === 0) this._idle(worker);
		}
	}

	/**
	 * Starts one thread on WorkerChild.js.
	 * @returns {PoolWorker} its record
	 */
	_spawn() {
		const id = this._nextWorkerId++;
		const thread = new /** @type {WorkerThreads} */ (workerThreads).Worker(
			require.resolve("./WorkerChild"),
			{
				workerData: /** @type {WorkerData} */ ({
					kind: WORKER_DATA_KIND,
					workerId: id
				})
			}
		);
		/** @type {PoolWorker} */
		const worker = {
			id,
			thread,
			state: "idle",
			calls: new Map(),
			lastJobType: undefined,
			preloads: new Map(),
			idleTimer: undefined,
			error: undefined,
			releaseWhenIdle: false,
			closeWhenIdle: false,
			exitWaiters: []
		};
		this._workers.add(worker);
		this._idleWorkers.push(worker);
		this._spawned++;
		thread.on(
			"message",
			(/** @type {import("./protocol").WorkerToMainMessage} */ message) =>
				this._onMessage(worker, message)
		);
		thread.on("error", (/** @type {ThrownValue} */ error) => {
			worker.error = toError(error);
			this._terminate(worker);
		});
		thread.on("messageerror", (/** @type {ThrownValue} */ error) => {
			worker.error = toError(error);
			this._terminate(worker);
		});
		thread.on("exit", (code) => this._exit(worker, code));
		this._idle(worker);
		return worker;
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {string[]} modules absolute paths of modules to load
	 * @returns {Promise<void>} settled when the preload was acknowledged
	 */
	_preload(worker, modules) {
		return new Promise((resolve, reject) => {
			const id = this._nextPreloadId++;
			this._removeIdle(worker);
			if (worker.idleTimer !== undefined) {
				clearTimeout(worker.idleTimer);
				worker.idleTimer = undefined;
			}
			worker.thread.ref();
			worker.preloads.set(id, {
				resolve: (error) => (error === undefined ? resolve() : reject(error))
			});
			/** @type {PreloadMessage} */
			const message = { type: "preload", id, modules };
			try {
				worker.thread.postMessage(message);
			} catch (error) {
				worker.preloads.delete(id);
				if (worker.calls.size === 0) this._idle(worker);
				reject(toError(error));
				this._dispatch();
			}
		});
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {import("./protocol").WorkerToMainMessage} message the message
	 * @returns {void}
	 */
	_onMessage(worker, message) {
		switch (message.type) {
			case "preloaded": {
				const pending = worker.preloads.get(message.id);
				if (pending === undefined) return;
				worker.preloads.delete(message.id);
				pending.resolve(
					message.ok
						? undefined
						: message.error === undefined
							? new Error("The preload failed")
							: decodeError(message.error)
				);
				if (worker.state === "idle") {
					if (worker.releaseWhenIdle && this._ending === undefined) {
						this._retire(worker);
					} else {
						this._idle(worker);
					}
				}
				this._dispatch();
				break;
			}
			case "response":
				this._settle(worker, message);
				break;
			case "rpc":
				this._answer(worker, message);
				break;
		}
	}

	/**
	 * Routes a main-thread call from a loader job.
	 * @param {PoolWorker} worker the thread
	 * @param {RpcMessage} message the call
	 * @returns {void}
	 */
	_answer(worker, message) {
		const call = worker.calls.get(message.jobId);
		const id = message.callId;
		if (call === undefined || call.rpc === undefined) {
			if (id !== undefined) {
				this._postRpcError(
					worker,
					message.jobId,
					id,
					new Error("No call in flight")
				);
			}
			return;
		}
		const rpc = call.rpc;
		if (id !== undefined) {
			call.blocked = true;
			this._dispatch();
		}
		Promise.resolve()
			.then(() => rpc(message.method, message.args))
			.then(
				(value) => {
					call.blocked = false;
					if (id === undefined) return;
					try {
						worker.thread.postMessage({
							type: "rpc-result",
							jobId: message.jobId,
							callId: id,
							ok: true,
							value
						});
					} catch (error) {
						this._postRpcError(worker, message.jobId, id, toError(error));
					}
				},
				(/** @type {ThrownValue} */ error) => {
					call.blocked = false;
					if (id === undefined) return;
					this._postRpcError(worker, message.jobId, id, toError(error));
				}
			);
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {number} jobId the job
	 * @param {number} callId the call
	 * @param {Error} error what the handler threw
	 * @returns {void}
	 */
	_postRpcError(worker, jobId, callId, error) {
		try {
			worker.thread.postMessage({
				type: "rpc-result",
				jobId,
				callId,
				ok: false,
				error: encodeError(error)
			});
		} catch (_err) {
			worker.error = toError(_err);
			this._terminate(worker);
		}
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {ResponseMessage} message the response
	 * @returns {void}
	 */
	_settle(worker, message) {
		const call = worker.calls.get(message.id);
		if (call === undefined) return;
		worker.calls.delete(message.id);
		this._completed++;
		if (message.ok) {
			call.resolve(message.value);
		} else {
			call.reject(decodeError(message.error));
		}
		if (worker.calls.size === 0) {
			if (
				(this._ending !== undefined || worker.closeWhenIdle) &&
				worker.preloads.size === 0
			) {
				this._close(worker);
			} else if (
				worker.state === "busy" &&
				worker.releaseWhenIdle &&
				worker.preloads.size === 0 &&
				this._ending === undefined
			) {
				worker.state = "idle";
				this._retire(worker);
			} else {
				this._idle(worker);
			}
		}
		this._dispatch();
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @returns {void}
	 */
	_idle(worker) {
		if (worker.state === "exited" || worker.state === "exiting") return;
		if (!this._workers.has(worker)) return;
		if (worker.calls.size !== 0) return;
		worker.state = "idle";
		if (!this._idleWorkers.includes(worker)) {
			this._idleWorkers.push(worker);
		}
		if (worker.preloads.size > 0) return;
		worker.thread.unref();
		if (worker.idleTimer !== undefined) return;
		if (this._ending !== undefined) {
			this._close(worker);
			return;
		}
		worker.idleTimer = setTimeout(
			() => this._retire(worker),
			worker.lastJobType === "loader"
				? this.options.loaderPoolTimeout
				: this.options.idleTimeout
		);
		worker.idleTimer.unref();
	}

	/**
	 * Closes an idle thread and lets it exit on its own.
	 * @param {PoolWorker} worker the thread
	 * @returns {void}
	 */
	_close(worker) {
		if (worker.state === "exiting" || worker.state === "exited") return;
		worker.state = "exiting";
		this._removeIdle(worker);
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		try {
			worker.thread.postMessage({ type: "close" });
		} catch (_err) {
			this._terminate(worker);
		}
	}

	/**
	 * Terminates a thread and forgets it.
	 * @param {PoolWorker} worker the thread
	 * @returns {Promise<void>} settled when it exited
	 */
	_terminate(worker) {
		if (worker.state === "exited") return Promise.resolve();
		worker.state = "exiting";
		this._removeIdle(worker);
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		return terminateThread(worker.thread);
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @returns {Promise<void>} settled when it exited
	 */
	_retire(worker) {
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		if (worker.state !== "idle" || worker.calls.size > 0) {
			return Promise.resolve();
		}
		if (worker.preloads.size > 0) {
			worker.releaseWhenIdle = true;
			return Promise.resolve();
		}
		return this._terminate(worker);
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @returns {void}
	 */
	_removeIdle(worker) {
		const index = this._idleWorkers.indexOf(worker);
		if (index !== -1) this._idleWorkers.splice(index, 1);
	}

	/**
	 * @param {PoolWorker} worker the thread
	 * @param {number} code its exit code
	 * @returns {void}
	 */
	_exit(worker, code) {
		if (!this._workers.has(worker)) {
			this._finishEnding();
			return;
		}
		this._workers.delete(worker);
		this._removeIdle(worker);
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		worker.state = "exited";
		const cause = worker.error === undefined ? "" : `: ${worker.error.message}`;
		if (worker.calls.size > 0) this._crashed++;
		for (const call of worker.calls.values()) {
			call.reject(
				new Error(
					`Worker ${worker.id} exited with code ${code} during ${call.method}${cause}`
				)
			);
		}
		worker.calls.clear();
		for (const pending of worker.preloads.values()) {
			pending.resolve(
				new Error(`Worker ${worker.id} exited with code ${code}${cause}`)
			);
		}
		worker.preloads.clear();
		for (const resolve of worker.exitWaiters) resolve();
		worker.exitWaiters.length = 0;
		this._dispatch();
		this._finishEnding();
	}

	/**
	 * @returns {void}
	 */
	_finishEnding() {
		if (this._resolveEnding === undefined) return;
		if (this._workers.size > 0 || this._inlineRunning > 0) return;
		if (this._endingTimer !== undefined) {
			clearTimeout(this._endingTimer);
			this._endingTimer = undefined;
		}
		const resolve = this._resolveEnding;
		this._resolveEnding = undefined;
		this._inlineModules.clear();
		this._queue.clear();
		resolve();
	}
}

/**
 * @param {Compiler} compiler the compiler
 * @returns {WorkerFactory} the factory
 */
const createWorkerFactory = (compiler) => {
	if (compiler._workerFactoryClosed) {
		throw new Error("The worker pool is closed");
	}
	const { threads } = compiler.options.experiments;
	if (!threads) throw new Error("experiments.threads is off");
	const max =
		threads.max === undefined ? getDefaultMax() : Math.floor(threads.max);
	const loaders = threads.loaders;
	const pool = new WorkerPool({
		max,
		idleTimeout: 30000,
		loaderPoolTimeout:
			loaders === undefined || loaders.poolTimeout === undefined
				? 500
				: loaders.poolTimeout,
		loaderParallelJobs:
			loaders === undefined || loaders.parallelJobs === undefined
				? 20
				: loaders.parallelJobs,
		strictClone: true
	});
	compiler._workerPoolInstance = pool;
	/** @type {Map<string, Worker>} */
	const workers = new Map();
	/**
	 * @param {string | URL} workerPath absolute path or file URL
	 * @param {WorkerOptions=} options reserved options
	 * @returns {Worker} the facade
	 */
	return (workerPath, options) => {
		const module = normalizeWorkerPath(workerPath);
		let worker = workers.get(module);
		if (worker === undefined) {
			worker = new (require("./Worker"))(pool, module, options);
			workers.set(module, worker);
		}
		return worker;
	};
};

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

module.exports = WorkerPool;
module.exports.createWorkerFactory = createWorkerFactory;
