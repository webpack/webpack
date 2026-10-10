/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/*
	Who lives where. Every box is one object; the two columns are threads.

	  main thread                         worker thread (one per FarmWorker)

	  ┌────────────────────────┐
	  │ WorkerFarm             │
	  │ one per Compiler       │
	  └───────────┬────────────┘
	              │ owns up to `max`
	  ┌───────────▼────────────┐         ┌────────────────────────┐  requires  ┌───────────────┐
	  │ FarmWorker             │         │ WorkerChild            │───────────▶│ target module │
	  │ one per thread         │         │ one per thread         │  and calls │ method(ctx,…) │
	  └───────────┬────────────┘         └───────────┬────────────┘            └───────────────┘
	              │ holds                            │ reads
	  ┌───────────▼────────────┐         ┌───────────▼────────────┐
	  │ worker_threads.Worker  │◀═══════▶│ parentPort             │
	  │ Node's main-side handle│ channel │ Node's thread-side end │
	  └────────────────────────┘         └────────────────────────┘

	  a call:   bind() ▶ RemoteFunction ▶ _queue ▶ Worker.postMessage ▶ parentPort ▶ receive() ▶ method
	  a result: resolve() ◀ Worker.on("message") ◀ parentPort.postMessage ◀ WorkerChild

	`new Worker(child.js)` makes the channel: the Worker object is its main-side
	end and parentPort its thread-side end. The farm never constructs
	WorkerChild; child.js does, when it runs as the thread script. On the inline
	path (no worker_threads, `max: 0`, or `inline`) the farm requires the target
	module itself and calls it with an inline WorkerContext, so the lower row
	does not exist.
*/

const path = require("path");
const v8 = require("v8");
const { SyncHook } = require("tapable");
const memoize = require("../memoize");
const {
	MESSAGE_TYPE,
	TransferResult,
	decodeError,
	encodeError
} = require("./protocol");

/** @typedef {import("worker_threads")} WorkerThreads */
/** @typedef {import("worker_threads").Worker} WorkerThread */
/** @typedef {import("worker_threads").ResourceLimits} ResourceLimits */
/** @typedef {import("../../Compiler")} Compiler */
/** @typedef {import("../../logging/Logger").LogTypeEnum} LogTypeEnum */
/** @typedef {import("./child").WorkerContext} WorkerContext */
/** @typedef {import("./handle")} Handle */
/** @typedef {import("./handle").HandleFunction} HandleFunction */
/** @typedef {import("./protocol").CallTarget} CallTarget */
/** @typedef {import("./protocol").ModuleTarget} ModuleTarget */
/** @typedef {import("./protocol").Encoding} Encoding */
/** @typedef {import("./protocol").TransferListItem} TransferListItem */
/** @typedef {import("./protocol").CallMessage} CallMessage */
/** @typedef {import("./protocol").ResponseMessage} ResponseMessage */
/** @typedef {import("./protocol").WorkerToMainMessage} WorkerToMainMessage */
/** @typedef {import("./child").WorkerModule} WorkerModule */
/** @typedef {import("../../logging/Logger").Logger} Logger */

const getLoggerClass = memoize(() => require("../../logging/Logger").Logger);

/**
 * `worker_threads` is behind a flag below Node 12, and its absence is what puts the farm on the inline path.
 */
const getWorkerThreads = memoize(() => {
	try {
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return /** @type {WorkerThreads} */ (require("worker_threads"));
	} catch (_err) {
		return undefined;
	}
});

/**
 * @typedef {object} FarmOptions
 * @property {number} max upper bound of threads; `0` runs every call inline
 * @property {number} min threads kept alive through `idleTimeout`
 * @property {number} idleTimeout milliseconds an idle thread survives; an idle thread is released at once so the process can exit without `end`
 * @property {ResourceLimits=} resourceLimits passed to each thread where Node supports it
 * @property {boolean} strictClone clone arguments and results on the inline path the way the remote path does
 */

/**
 * Scheduling fixed for every call made through one bound function.
 * @template {unknown[]} Args
 * @typedef {object} BindOptions
 * @property {number=} concurrency calls in flight per thread; `1` unless the function awaits I/O
 * @property {number=} retries re-dispatches after a thread crash; `0` unless the function's side effects may replay
 * @property {((args: Args) => string)=} workerKey calls with the same key go to the thread that last served it, so state it keeps per key is reused
 * @property {boolean=} inline run on the main thread regardless of the farm
 */

/**
 * @typedef {object} CallOptions
 * @property {TransferListItem[]=} transfer handed over instead of copied; only buffers the caller allocated whole
 * @property {AbortSignal=} signal rejects a queued call at once; a running call finishes and its result is dropped
 * @property {boolean=} inline run this call on the main thread
 */

/**
 * @template {unknown[]} Args
 * @template Result
 * @typedef {(args: Args, options?: CallOptions) => Promise<Result>} RemoteFunction
 */

/**
 * @typedef {object} ShareOptions
 * @property {Encoding=} encoding `"clone"` unless the value's class is registered with `makeSerializable`
 */

/**
 * @typedef {object} SharedReference
 * @property {number} ref what a call passes in its arguments; threads look the value up by it
 * @property {() => Promise<void>} dispose forgets the value everywhere it was pushed
 */

/**
 * @typedef {object} EndOptions
 * @property {boolean=} force terminate instead of waiting for in-flight calls
 */

/**
 * @typedef {object} FarmStats
 * @property {number} workers live threads
 * @property {number} idle threads with nothing in flight
 * @property {number} queued calls waiting for a thread
 * @property {number} running calls in flight, remote and inline
 * @property {number} completed calls settled since the farm was created
 * @property {number} spawned threads started since the farm was created
 * @property {number} crashed threads that exited with a call in flight
 */

/**
 * A call waiting for, or in flight on, a thread.
 * @typedef {object} PendingCall
 * @property {number} id echoed by the response
 * @property {ModuleTarget} target what to run
 * @property {unknown[]} args arguments after the worker context
 * @property {BindOptions<unknown[]>} bindOptions scheduling of the bound function
 * @property {CallOptions} callOptions options of this call
 * @property {string | undefined} workerKey what the bound function's `workerKey` made of the arguments
 * @property {number} retries re-dispatches so far
 * @property {(value: unknown) => void} resolve settles the caller
 * @property {(error: Error) => void} reject settles the caller
 */

/**
 * The farm's record of one thread.
 * @typedef {object} FarmWorker
 * @property {number} id id given in `init`
 * @property {WorkerThread} thread the thread
 * @property {boolean} ready `ready` was received
 * @property {Map<number, PendingCall>} inFlight by call id
 * @property {Set<number>} shared references already pushed to this thread
 * @property {NodeJS.Timeout | undefined} idleTimer runs while the thread has nothing in flight
 * @property {Error | undefined} error what the thread threw before exiting, if anything
 */

/**
 * @typedef {object} SharedEntry
 * @property {unknown} value the value as registered, what the inline context hands out
 * @property {Encoding} encoding how it is pushed
 * @property {unknown} payload what is posted: the value itself under `clone`, its buffers under `webpack`
 */

/** @type {BindOptions<unknown[]>} */
const DEFAULT_BIND_OPTIONS = {
	concurrency: 1,
	retries: 0,
	inline: false
};

/** Threads inheriting an inspector flag would all bind the same port */
const INSPECTOR_FLAG_REGEXP = /^--(inspect|debug)/;

/**
 * @param {string[]} execArgv the process's flags
 * @returns {string[]} the flags a thread may inherit
 */
const filterExecArgv = (execArgv) =>
	execArgv.filter((flag) => !INSPECTOR_FLAG_REGEXP.test(flag));

/**
 * Copies a value the way `postMessage` would, so the inline path fails on the same values the remote path does.
 * @template T
 * @param {T} value the value
 * @returns {T} its copy
 */
const cloneValue = (value) => v8.deserialize(v8.serialize(value));

/**
 * @returns {Error} what an aborted call rejects with
 */
const createAbortError = () => {
	const error = new Error("The call was aborted");
	error.name = "AbortError";
	return error;
};

/**
 * A pool of threads any module can be run on, with calls in both directions and values shared once. Without `worker_threads`, or with `max: 0`, every call runs inline through the same path.
 */
class WorkerFarm {
	/**
	 * @param {FarmOptions} options options
	 */
	constructor(options) {
		this.options = options;
		this.hooks = Object.freeze({
			/** @type {SyncHook<[number]>} */
			workerSpawned: new SyncHook(["workerId"]),
			/** @type {SyncHook<[number, number]>} */
			workerExited: new SyncHook(["workerId", "exitCode"]),
			/** @type {SyncHook<[string, LogTypeEnum, unknown[]]>} */
			log: new SyncHook(["name", "type", "args"])
		});
		/** @type {Map<number, FarmWorker>} */
		this._workers = new Map();
		/** @type {PendingCall[]} */
		this._queue = [];
		/** @type {Map<number, HandleFunction>} */
		this._exposed = new Map();
		/** @type {Map<number, SharedEntry>} */
		this._shared = new Map();
		/** @type {Map<string, number>} */
		this._workerIdByKey = new Map();
		/** @type {WorkerContext | undefined} */
		this._inlineContext = undefined;
		/** @type {Map<string, Promise<WorkerModule>>} */
		this._inlineModules = new Map();
		this._inlineRunning = 0;
		this._nextWorkerId = 1;
		this._nextCallId = 1;
		this._nextHandleId = 1;
		this._nextReference = 1;
		/** @type {Promise<void> | undefined} */
		this._ending = undefined;
		this._completed = 0;
		this._spawned = 0;
		this._crashed = 0;
	}

	/**
	 * @returns {boolean} whether this Node can spawn threads at all
	 */
	static isThreadingAvailable() {
		return getWorkerThreads() !== undefined;
	}

	/**
	 * Binds a target to a function that dispatches each call to the farm. The options fix the scheduling for every call made through it.
	 * @template {unknown[]} Args
	 * @template Result
	 * @param {ModuleTarget} target what to run
	 * @param {BindOptions<Args>=} options scheduling for every call
	 * @returns {RemoteFunction<Args, Result>} the bound function
	 */
	bind(target, options) {
		const bindOptions = /** @type {BindOptions<unknown[]>} */ ({
			...DEFAULT_BIND_OPTIONS,
			...options
		});
		return (args, callOptions) =>
			/** @type {Promise<Result>} */ (
				this._enqueue(target, args, bindOptions, callOptions || {})
			);
	}

	/**
	 * One-off form of `bind`.
	 * @param {ModuleTarget} target what to run
	 * @param {unknown[]} args arguments after the worker context
	 * @param {(BindOptions<unknown[]> & CallOptions)=} options scheduling and options of this call
	 * @returns {Promise<unknown>} what the target returned
	 */
	run(target, args, options) {
		const merged = { ...DEFAULT_BIND_OPTIONS, ...options };
		return this._enqueue(target, args, merged, merged);
	}

	/**
	 * Registers a value to be pushed to each thread once and referred to by number afterwards.
	 * @param {unknown} value the value
	 * @param {ShareOptions=} options how it is pushed
	 * @returns {SharedReference} the reference
	 */
	share(value, options) {
		throw new Error("Not implemented");
	}

	/**
	 * Exposes a main-thread function to threads as a handle they can call.
	 * @param {HandleFunction} fn the function
	 * @returns {Handle} its token, which can travel inside any call's arguments
	 */
	expose(fn) {
		throw new Error("Not implemented");
	}

	/**
	 * Runs a target on every live thread and on the inline module, for cache invalidation.
	 * @param {CallTarget} target what to run
	 * @param {unknown[]} args arguments after the worker context
	 * @returns {Promise<void>} settled when every side answered
	 */
	broadcast(target, args) {
		throw new Error("Not implemented");
	}

	/**
	 * Spawns up to `max` threads and preloads the modules in each, so thread start overlaps other work.
	 * @param {string[]} modules absolute paths
	 * @returns {Promise<void>} settled when every thread is ready
	 */
	warmup(modules) {
		throw new Error("Not implemented");
	}

	/**
	 * @returns {FarmStats} counts
	 */
	get stats() {
		throw new Error("Not implemented");
	}

	/**
	 * Ends the farm; waits for in-flight calls unless forced.
	 * @param {EndOptions=} options options
	 * @returns {Promise<void>} settled when every thread exited
	 */
	end(options) {
		throw new Error("Not implemented");
	}

	/**
	 * Runs a call inline or queues it for a thread; every public entry point ends here.
	 * @param {ModuleTarget} target what to run
	 * @param {unknown[]} args arguments after the worker context
	 * @param {BindOptions<unknown[]>} bindOptions scheduling of the bound function
	 * @param {CallOptions} callOptions options of this call
	 * @returns {Promise<unknown>} what the target returned
	 */
	_enqueue(target, args, bindOptions, callOptions) {
		if (this._ending !== undefined) {
			return Promise.reject(new Error("The farm is ending"));
		}
		if (this._shouldRunInline(bindOptions, callOptions)) {
			return this._runInline(target, args);
		}
		return new Promise((resolve, reject) => {
			/** @type {PendingCall} */
			const call = {
				id: this._nextCallId++,
				target,
				args,
				bindOptions,
				callOptions,
				workerKey: bindOptions.workerKey
					? bindOptions.workerKey(args)
					: undefined,
				retries: 0,
				resolve,
				reject
			};
			const { signal } = callOptions;
			if (signal !== undefined) {
				if (signal.aborted) {
					reject(createAbortError());
					return;
				}
				signal.addEventListener(
					"abort",
					() => {
						const index = this._queue.indexOf(call);
						if (index !== -1) this._queue.splice(index, 1);
						reject(createAbortError());
					},
					{ once: true }
				);
			}
			this._queue.push(call);
			this._dispatch();
		});
	}

	/**
	 * @param {BindOptions<unknown[]>} bindOptions scheduling of the bound function
	 * @param {CallOptions} callOptions options of this call
	 * @returns {boolean} whether the call stays on the main thread
	 */
	_shouldRunInline(bindOptions, callOptions) {
		return (
			this.options.max === 0 ||
			bindOptions.inline === true ||
			callOptions.inline === true ||
			!WorkerFarm.isThreadingAvailable()
		);
	}

	/**
	 * Runs a call on the main thread under the same module contract a thread applies.
	 * @param {ModuleTarget} target what to run
	 * @param {unknown[]} args arguments after the worker context
	 * @returns {Promise<unknown>} what the target returned
	 */
	async _runInline(target, args) {
		const { strictClone } = this.options;
		const workerModule = await this._loadInline(target.module);
		const method = workerModule[target.method];
		if (typeof method !== "function") {
			throw new Error(`${target.module} has no export named ${target.method}`);
		}
		this._inlineRunning++;
		try {
			const result = await method(
				this._getInlineContext(),
				...(strictClone ? cloneValue(args) : args)
			);
			const value = result instanceof TransferResult ? result.value : result;
			return strictClone ? cloneValue(value) : value;
		} finally {
			this._inlineRunning--;
			this._completed++;
		}
	}

	/**
	 * Requires a module on the main thread and runs its `init` once, mirroring `WorkerChild.load`.
	 * @param {string} module absolute path
	 * @returns {Promise<WorkerModule>} the module
	 */
	_loadInline(module) {
		let loaded = this._inlineModules.get(module);
		if (loaded === undefined) {
			loaded = Promise.resolve().then(() => {
				/** @type {WorkerModule} */
				const workerModule = require(module);

				if (typeof workerModule.init !== "function") return workerModule;
				return Promise.resolve(
					workerModule.init(this._getInlineContext())
				).then(() => workerModule);
			});
			this._inlineModules.set(module, loaded);
		}
		return loaded;
	}

	/**
	 * The context handed to modules on the main thread; its calls to the main thread are plain local calls.
	 * @returns {WorkerContext} the context
	 */
	_getInlineContext() {
		if (this._inlineContext !== undefined) return this._inlineContext;
		/** @type {WorkerContext} */
		const context = {
			isWorker: false,
			workerId: undefined,
			getSharedReference: (ref) => {
				const entry = this._shared.get(ref);
				return entry === undefined ? undefined : entry.value;
			},
			callMain: (target, args) => this._runLocal(target, args),
			callHandle: (handle, args) => this._runLocal({ handle: handle.id }, args),
			expose: (fn) => this.expose(fn),
			getLogger: (name) => this._createLogger(name),
			transfer: (value, transfer) => new TransferResult(value, transfer)
		};
		this._inlineContext = context;
		return context;
	}

	/**
	 * A logger whose entries go through `hooks.log`, the way a thread's batched entries do.
	 * @param {string} name logger name
	 * @returns {Logger} the logger
	 */
	_createLogger(name) {
		const LoggerClass = getLoggerClass();
		return new LoggerClass(
			(type, args) => this.hooks.log.call(name, type, args || []),
			(childName) =>
				this._createLogger(
					`${name}/${typeof childName === "function" ? childName() : childName}`
				)
		);
	}

	/**
	 * Runs a target on the main thread: an exposed function by handle, or a module's method.
	 * @param {CallTarget} target what to run
	 * @param {unknown[]} args its arguments
	 * @returns {Promise<unknown>} what it returned
	 */
	_runLocal(target, args) {
		if ("handle" in target) {
			const fn = this._exposed.get(target.handle);
			if (fn === undefined) {
				return Promise.reject(
					new Error(`No exposed function with handle ${target.handle}`)
				);
			}
			return Promise.resolve().then(() => fn(...args));
		}
		return this._runInline(target, args);
	}

	/**
	 * Hands queued calls to threads with capacity, spawning while the farm is below `max`.
	 * @returns {void}
	 */
	_dispatch() {
		while (this._queue.length > 0) {
			const call = this._queue[0];
			let worker = this._pickWorker(call);
			if (worker === undefined) {
				if (this._workers.size >= this.options.max) return;
				worker = this._spawn();
			}
			this._queue.shift();
			this._send(worker, call);
		}
	}

	/**
	 * The thread a call goes to: the one its key last went to, else an idle thread, else any with capacity.
	 * @param {PendingCall} call the call
	 * @returns {FarmWorker | undefined} the thread, when one has capacity
	 */
	_pickWorker(call) {
		const capacity = call.bindOptions.concurrency || 1;
		if (call.workerKey !== undefined) {
			const preferredId = this._workerIdByKey.get(call.workerKey);
			const preferred =
				preferredId === undefined ? undefined : this._workers.get(preferredId);
			if (preferred !== undefined && preferred.inFlight.size < capacity) {
				return preferred;
			}
		}
		/** @type {FarmWorker | undefined} */
		let fallback;
		for (const worker of this._workers.values()) {
			if (worker.inFlight.size === 0) return worker;
			if (fallback === undefined && worker.inFlight.size < capacity) {
				fallback = worker;
			}
		}
		return fallback;
	}

	/**
	 * Posts a call to a thread, pushing first any shared reference the thread has not seen.
	 * @param {FarmWorker} worker the thread
	 * @param {PendingCall} call the call
	 * @returns {void}
	 */
	_send(worker, call) {
		for (const [ref, entry] of this._shared) {
			if (worker.shared.has(ref)) continue;
			worker.shared.add(ref);
			worker.thread.postMessage({
				type: MESSAGE_TYPE.SHARE,
				ref,
				encoding: entry.encoding,
				value: entry.payload
			});
		}
		if (worker.idleTimer !== undefined) {
			clearTimeout(worker.idleTimer);
			worker.idleTimer = undefined;
		}
		worker.thread.ref();
		worker.inFlight.set(call.id, call);
		if (call.workerKey !== undefined) {
			this._workerIdByKey.set(call.workerKey, worker.id);
		}
		/** @type {CallMessage} */
		const message = {
			type: MESSAGE_TYPE.CALL,
			id: call.id,
			target: call.target,
			args: call.args
		};
		worker.thread.postMessage(message, call.callOptions.transfer);
	}

	/**
	 * Starts one thread on child.js and wires its events; the `init` message is the first it receives.
	 * @returns {FarmWorker} its record
	 */
	_spawn() {
		const workerThreads = /** @type {WorkerThreads} */ (getWorkerThreads());
		const id = this._nextWorkerId++;
		const thread = new workerThreads.Worker(path.join(__dirname, "child.js"), {
			workerData: { workerId: id },
			execArgv: filterExecArgv(process.execArgv),
			resourceLimits: this.options.resourceLimits
		});
		/** @type {FarmWorker} */
		const worker = {
			id,
			thread,
			ready: false,
			inFlight: new Map(),
			shared: new Set(),
			idleTimer: undefined,
			error: undefined
		};
		this._workers.set(id, worker);
		this._spawned++;
		thread.on("message", (message) => this._receive(worker, message));
		thread.on("error", (error) => {
			worker.error = error instanceof Error ? error : new Error(String(error));
		});
		thread.on("exit", (code) => this._exit(worker, code));
		thread.postMessage({ type: MESSAGE_TYPE.INIT, workerId: id, preload: [] });
		this.hooks.workerSpawned.call(id);
		return worker;
	}

	/**
	 * Releases a thread with nothing in flight and starts its idle clock, unless `min` keeps it.
	 * @param {FarmWorker} worker the thread
	 * @returns {void}
	 */
	_idle(worker) {
		worker.thread.unref();
		if (
			worker.idleTimer !== undefined ||
			this._workers.size <= this.options.min
		) {
			return;
		}
		worker.idleTimer = setTimeout(
			() => this._retire(worker),
			this.options.idleTimeout
		);
		worker.idleTimer.unref();
	}

	/**
	 * Terminates a thread whose idle clock ran out; a call dispatched meanwhile has cleared the clock.
	 * @param {FarmWorker} worker the thread
	 * @returns {void}
	 */
	_retire(worker) {
		worker.idleTimer = undefined;
		if (worker.inFlight.size > 0 || this._workers.size <= this.options.min) {
			return;
		}
		this._workers.delete(worker.id);
		worker.thread.terminate();
	}

	/**
	 * Routes one message from a thread.
	 * @param {FarmWorker} worker the thread
	 * @param {WorkerToMainMessage} message the message
	 * @returns {void}
	 */
	_receive(worker, message) {
		switch (message.type) {
			case MESSAGE_TYPE.READY:
				worker.ready = true;
				break;
			case MESSAGE_TYPE.RESPONSE:
				this._settle(worker, message);
				break;
			case MESSAGE_TYPE.LOG:
				for (const entry of message.entries) {
					this.hooks.log.call(entry.name, entry.type, entry.args);
				}
				break;
			case MESSAGE_TYPE.CALL:
				this._answer(worker, message);
				break;
		}
	}

	/**
	 * Settles the in-flight call a response answers, then lets the thread take the next one.
	 * @param {FarmWorker} worker the thread
	 * @param {ResponseMessage} message the response
	 * @returns {void}
	 */
	_settle(worker, message) {
		const call = worker.inFlight.get(message.id);
		if (call === undefined) return;
		worker.inFlight.delete(message.id);
		this._completed++;
		if (message.ok) {
			call.resolve(message.value);
		} else {
			call.reject(decodeError(message.error));
		}
		if (worker.inFlight.size === 0) this._idle(worker);
		this._dispatch();
	}

	/**
	 * Runs a call a thread made to the main thread and posts the answer when one was asked for.
	 * @param {FarmWorker} worker the thread
	 * @param {CallMessage} message the call
	 * @returns {void}
	 */
	_answer(worker, message) {
		const { id } = message;
		this._runLocal(message.target, message.args).then(
			(value) => {
				if (id === undefined) return;
				const result =
					value instanceof TransferResult
						? value
						: new TransferResult(value, []);
				worker.thread.postMessage(
					{ type: MESSAGE_TYPE.RESPONSE, id, ok: true, value: result.value },
					result.transfer
				);
			},
			(error) => {
				if (id === undefined) return;
				worker.thread.postMessage({
					type: MESSAGE_TYPE.RESPONSE,
					id,
					ok: false,
					error: encodeError(error)
				});
			}
		);
	}

	/**
	 * Forgets a thread that exited, re-queuing its in-flight calls while their retries allow and rejecting the rest.
	 * @param {FarmWorker} worker the thread
	 * @param {number} code its exit code
	 * @returns {void}
	 */
	_exit(worker, code) {
		this._workers.delete(worker.id);
		if (worker.idleTimer !== undefined) clearTimeout(worker.idleTimer);
		if (worker.inFlight.size > 0) this._crashed++;
		/** @type {PendingCall[]} */
		const requeued = [];
		for (const call of worker.inFlight.values()) {
			if (call.retries < (call.bindOptions.retries || 0)) {
				call.retries++;
				requeued.push(call);
			} else {
				const cause =
					worker.error === undefined ? "" : `: ${worker.error.message}`;
				call.reject(
					new Error(
						`Worker ${worker.id} exited with code ${code} during ${call.target.method}${cause}`
					)
				);
			}
		}
		worker.inFlight.clear();
		this._queue.unshift(...requeued);
		this.hooks.workerExited.call(worker.id, code);
		this._dispatch();
	}
}

/**
 * The farm owned by a compiler, created from its `threads` option on first use and ended from its shutdown hook.
 * @param {Compiler} compiler the compiler
 * @returns {WorkerFarm} its farm
 */
const getWorkerFarm = (compiler) => {
	throw new Error("Not implemented");
};

module.exports = WorkerFarm;

WorkerFarm.getWorkerFarm = getWorkerFarm;
