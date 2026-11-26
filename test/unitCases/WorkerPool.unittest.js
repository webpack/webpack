"use strict";

const path = require("path");
const Worker = require("../../lib/worker/Worker");
const WorkerPool = require("../../lib/worker/WorkerPool");

const TARGET = path.resolve(__dirname, "../fixtures/worker-pool/worker.js");
const OTHER = path.resolve(__dirname, "../fixtures/worker-pool/other.js");
const BROKEN = path.resolve(__dirname, "../fixtures/worker-pool/broken.js");
const SLOW = path.resolve(__dirname, "../fixtures/worker-pool/slow.js");

/** @typedef {import("../../lib/worker/WorkerPool").WorkerPoolOptions} WorkerPoolOptions */

/**
 * @param {Partial<WorkerPoolOptions>=} options overrides
 * @returns {WorkerPool} a pool
 */
const createPool = (options) =>
	new WorkerPool({
		max: 2,
		idleTimeout: 1000,
		strictClone: true,
		...options
	});

/**
 * Waits until `condition` holds, so a slow runner does not fail a timeout test.
 * @param {() => boolean} condition test
 * @returns {Promise<void>} resolved once it holds
 */
const waitFor = async (condition) => {
	for (let i = 0; i < 300; i++) {
		if (condition()) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("condition not met");
};

/**
 * What `info` in the fixture reports on the calling thread.
 * @returns {{ threadId: number, isMainThread: boolean }} the calling thread
 */
const callerThread = () => {
	try {
		const { threadId, isMainThread } = require("worker_threads");

		return { threadId, isMainThread };
	} catch (_err) {
		// Node 10 without --experimental-worker; the fixture reports the same
		return { threadId: 0, isMainThread: true };
	}
};

const describeThreads = WorkerPool.isThreadingAvailable()
	? describe
	: describe.skip;

describe("WorkerPool", () => {
	describe("inline", () => {
		it("runs calls on the main thread with max: 0", async () => {
			const pool = createPool({ max: 0 });

			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
			const info = await pool.run(TARGET, "info", []);
			// inline work runs on the caller's thread; under the Bun test
			// runner that thread is a jest worker, so compare, do not assume 0.
			expect(info).toEqual(callerThread());

			await expect(pool.run(TARGET, "missing", [])).rejects.toThrow(
				`${TARGET} has no export named missing`
			);
			// @ts-expect-error a function cannot be cloned
			await expect(pool.run(TARGET, "add", [() => {}, 1])).rejects.toThrow(
				/could not be cloned|can not be cloned/
			);
			await expect(pool.run(TARGET, "returnFunction", [])).rejects.toThrow(
				/could not be cloned|can not be cloned/
			);

			const error = /** @type {Error & { code?: string }} */ (
				await pool.run(TARGET, "fail", []).catch((err) => err)
			);
			expect(error.message).toBe("boom");
			expect(error.code).toBe("E_BOOM");
			await expect(pool.run(TARGET, "throwString", [])).rejects.toBeInstanceOf(
				Error
			);

			expect(await pool.warmup([TARGET], 4)).toBeUndefined();
			expect(pool.stats.workers).toBe(0);
			await pool.release();
			await pool.end();
			await expect(pool.run(TARGET, "add", [1, 2])).rejects.toThrow(
				"The worker pool is ending"
			);
			expect(pool.end()).toBe(pool.end());
		});

		it("passes values through without strictClone", async () => {
			const pool = createPool({ max: 0, strictClone: false });
			const fn = () => 1;
			// @ts-expect-error without strictClone a function passes through
			expect(await pool.run(TARGET, "echo", [fn])).toEqual([fn]);
		});

		it("rejects an invalid method instead of throwing", async () => {
			const pool = createPool({ max: 0 });
			const worker = new Worker(pool, TARGET);
			await expect(worker.run("")).rejects.toThrow(TypeError);
			await pool.end();
		});

		it("falls back for non-finite options", async () => {
			const pool = new WorkerPool({
				max: NaN,
				idleTimeout: Infinity,
				loaderPoolTimeout: NaN,
				loaderParallelJobs: NaN
			});
			expect(pool.options).toMatchObject({
				max: 0,
				idleTimeout: 30000,
				loaderPoolTimeout: 500,
				loaderParallelJobs: 20
			});
			await pool.end();
		});

		it("runs rpc jobs and non-Error throws inline", async () => {
			const pool = createPool({ max: 0 });
			expect(
				await pool.runJob(TARGET, "rpcAdd", [2, 3], {
					rpc: (method, args) =>
						method === "add"
							? /** @type {number} */ (args[0]) +
								/** @type {number} */ (args[1])
							: undefined
				})
			).toBe(5);
			expect(
				await pool.runJob(TARGET, "rpcNoWaitCloneFail", [], {
					rpc: () => undefined
				})
			).toBe("sent");
			const stringError = await pool
				.run(TARGET, "throwString", [])
				.catch((/** @type {ThrownValue} */ error) => error);
			expect(/** @type {Error} */ (stringError).message).toMatch(
				/not an error/
			);
			const plainError = await pool
				.run(TARGET, "failWithFunction", [])
				.catch((/** @type {ThrownValue} */ error) => error);
			expect(/** @type {Error & { code?: string }} */ (plainError).code).toBe(
				"E_BOOM"
			);
			await pool.end();
		});

		it("defaults missing arguments to none", async () => {
			const pool = createPool({ max: 0 });
			expect(await pool.run(TARGET, "echo")).toEqual([]);
			expect(await pool.runJob(TARGET, "echo")).toEqual([]);
			await pool.end();
		});

		it("wraps an inline clone failure like the remote path", async () => {
			const WorkerJobCloneError = require("../../lib/errors/WorkerJobCloneError");
			const pool = createPool({ max: 0 });

			const argsError = await pool
				// @ts-expect-error a function cannot be cloned
				.run(TARGET, "add", [() => {}, 1])
				.catch((/** @type {ThrownValue} */ error) => error);
			expect(argsError).toBeInstanceOf(WorkerJobCloneError);

			const resultError = await pool
				.run(TARGET, "returnFunction", [])
				.catch((/** @type {ThrownValue} */ error) => error);
			expect(resultError).not.toBeInstanceOf(WorkerJobCloneError);
			expect(/** @type {{ message?: string }} */ (resultError).message).toMatch(
				/clone/i
			);
		});
	});

	describe("compiler.worker", () => {
		it("runs calls directly on the main thread while experiments.threads is off", async () => {
			const webpack = require("../../lib/webpack");
			const { threadId } = callerThread();
			const compiler = webpack({ entry: "data:text/javascript,1" });
			const worker =
				/** @type {import("../../lib/worker/Worker")<{ add: (a: number, b: number) => number, info: () => { threadId: number }, echo: <T>(...args: T[]) => T[] }>} */ (
					compiler.worker(TARGET)
				);
			const fn = () => {};

			expect(compiler.worker(TARGET)).toBe(worker);
			expect(worker._pool.options.max).toBe(0);
			expect(worker._pool.options.strictClone).toBe(false);
			expect(await worker.run("add", 1, 2)).toBe(3);
			expect((await worker.run("info")).threadId).toBe(threadId);
			expect((await worker.run("echo", fn))[0]).toBe(fn);
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(compiler.worker(TARGET)).toBe(worker);
		});

		it("refuses a first worker after close while experiments.threads is off", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({ entry: "data:text/javascript,1" });

			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(() => compiler.worker(TARGET)).toThrow(/after compiler\.close/);
		});

		it("returns one facade per path and follows the pool max", async () => {
			const os = require("os");
			const webpack = require("../../lib/webpack");
			const cpus =
				typeof os.availableParallelism === "function"
					? os.availableParallelism()
					: (os.cpus() || { length: 1 }).length;
			// without worker_threads every pool runs inline
			const threaded = WorkerPool.isThreadingAvailable();

			/**
			 * @param {import("../../declarations/WebpackOptions").Experiments["threads"]} threads options
			 * @returns {import("../../lib/worker/Worker")} the facade
			 */
			const workerFor = (threads) => {
				const compiler = webpack({
					entry: "data:text/javascript,1",
					experiments: { threads }
				});
				return compiler.worker(TARGET);
			};

			const defaults = workerFor(true);
			expect(defaults).toBeInstanceOf(Worker);
			expect(defaults._pool.options.max).toBe(
				threaded ? Math.max(cpus - 1, 0) : 0
			);
			await defaults._pool.warmup([TARGET], 1);
			await defaults._pool.end();

			const two = workerFor({ max: 2.5 });
			expect(two._pool.options.max).toBe(
				threaded ? Math.min(2, Math.max(cpus - 1, 0)) : 0
			);
			await two._pool.end();

			// like minimizer-webpack-plugin's `parallel`: never above cores - 1
			const many = workerFor({ max: cpus + 8 });
			expect(many._pool.options.max).toBe(threaded ? Math.max(cpus - 1, 0) : 0);
			await many._pool.end();

			const inline = workerFor({ max: 0 });
			expect(await inline.run("info")).toEqual(callerThread());
			await inline._pool.release();
		});

		it("accepts the reserved options argument and types the module exports", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});

			const worker = compiler.worker(TARGET, {});

			expect(worker).toBeInstanceOf(Worker);
			expect(await worker.run("add", 1, 2)).toBe(3);

			// the facade can name the module's exports for checked calls
			const typed =
				/** @type {import("../../lib/worker/Worker")<{ add: (a: number, b: number) => number }>} */ (
					worker
				);
			expect(await typed.run("add", 1, 2)).toBe(3);

			// exports may include constants; async methods unwrap their promise
			const typedAsync = /** @type {import("../../lib/worker/Worker")<{
					version: string,
					addAsync: (a: number, b: number) => Promise<number>
				}>} */ (worker);
			expect(await typedAsync.run("addAsync", 1, 2)).toBe(3);
			await worker._pool.end();
		});

		it("runs shutdown again on close after a failed close", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			let shutdowns = 0;
			compiler.hooks.shutdown.tap("test", () => {
				shutdowns++;
				if (shutdowns === 1) throw new Error("shutdown failed");
			});
			/**
			 * @returns {Promise<void>} settled with what close reported
			 */
			const close = () =>
				new Promise((resolve, reject) => {
					compiler.close((err) => (err ? reject(err) : resolve()));
				});

			await expect(close()).rejects.toThrow("shutdown failed");
			await close();
			expect(shutdowns).toBe(2);
		});

		it("runs shutdown once when close is called twice", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			let shutdowns = 0;
			compiler.hooks.shutdown.tap("test", () => {
				shutdowns++;
			});
			const worker = compiler.worker(TARGET);
			await worker.run("add", 1, 2);
			await Promise.all([
				new Promise((resolve, reject) => {
					compiler.close((err) => (err ? reject(err) : resolve(undefined)));
				}),
				new Promise((resolve, reject) => {
					compiler.close((err) => (err ? reject(err) : resolve(undefined)));
				})
			]);
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(shutdowns).toBe(1);
		});

		it("rejects a relative path and accepts a file URL", async () => {
			const { pathToFileURL } = require("url");
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});

			expect(() => compiler.worker("relative/worker.js")).toThrow(
				/must be absolute/
			);
			const byUrl = compiler.worker(pathToFileURL(TARGET));
			expect(compiler.worker(TARGET)).toBe(byUrl);
			await byUrl._pool.end();
		});

		it("does not create a pool after close when none was used", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});

			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});

			expect(() => compiler.worker(TARGET)).toThrow(/after compiler\.close/);
			expect(compiler._getWorkerPool()).toBeUndefined();
		});

		it("keeps a worker created in a plugin's apply on the compiler's farm", async () => {
			const webpack = require("../../lib/webpack");
			/** @type {import("../../lib/worker/Worker") | undefined} */
			let early;
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: { max: 1 } },
				plugins: [
					{
						apply(compiler) {
							early = compiler.worker(TARGET);
						}
					}
				]
			});
			const farm = /** @type {import("../../lib/worker/WorkerFarm")} */ (
				compiler._workerFarm
			);

			expect(compiler.worker(TARGET)).toBe(early);
			farm.setKeepAlive(true);
			expect(
				/** @type {import("../../lib/worker/Worker")} */ (early)._pool
					._keepAlive
			).toBe(true);
			farm.setKeepAlive(false);
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			await expect(
				/** @type {import("../../lib/worker/Worker")} */ (early).run(
					"add",
					1,
					2
				)
			).rejects.toThrow("The worker pool is ending");
		});

		it("does not end the root pool when a child compiler closes", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			const worker = compiler.worker(TARGET);
			const compilation = compiler.newCompilation(
				compiler.newCompilationParams()
			);
			const child = compiler.createChildCompiler(
				compilation,
				"child",
				0,
				{},
				[]
			);

			await new Promise((resolve, reject) => {
				child.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(child.worker(TARGET)).toBe(worker);
			expect(await worker.run("add", 1, 2)).toBe(3);
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
		});

		it("keeps the factory after close and refuses new work", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			const worker = compiler.worker(TARGET);

			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});

			expect(compiler.worker(TARGET)).toBe(worker);
			await expect(worker.run("add", 1, 2)).rejects.toThrow(
				"The worker pool is ending"
			);
		});
	});

	describe("WorkerPlugin", () => {
		it("warns and runs calls inline when the runtime cannot provide threads", async () => {
			const WorkerPool = require("../../lib/worker/WorkerPool");
			const isThreadingAvailable = WorkerPool.isThreadingAvailable;
			WorkerPool.isThreadingAvailable = () => false;
			try {
				const webpack = require("../../lib/webpack");
				const compiler = webpack({
					entry: "data:text/javascript,1",
					experiments: { threads: true }
				});
				expect(compiler._workerFarm).toBeUndefined();
				const worker = compiler.worker(TARGET);
				expect(worker._pool.options.max).toBe(0);
				expect(await worker.run("add", 1, 2)).toBe(3);
				const stats = await new Promise((resolve, reject) => {
					compiler.run((err, stats) => {
						if (err) return reject(err);
						if (stats === undefined) return reject(new Error("no stats"));
						resolve(stats);
					});
				});
				await new Promise((resolve, reject) => {
					compiler.close((err) => (err ? reject(err) : resolve(undefined)));
				});
				expect(
					stats.compilation.warnings.some((/** @type {Error} */ warning) =>
						/worker_threads is unavailable/.test(warning.message)
					)
				).toBe(true);
			} finally {
				WorkerPool.isThreadingAvailable = isThreadingAvailable;
			}
		});
	});

	describeThreads("threads", () => {
		/** @type {WorkerPool[]} */
		const pools = [];

		/**
		 * @param {Partial<WorkerPoolOptions>=} options overrides
		 * @returns {WorkerPool} a pool ended after the test
		 */
		const createThreadPool = (options) => {
			const pool = createPool(options);
			pools.push(pool);
			return pool;
		};

		afterEach(async () => {
			await Promise.all(
				pools.splice(0).map((pool) => pool.end({ force: true }))
			);
		});

		it("runs calls and propagates errors", async () => {
			const pool = createThreadPool();

			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
			const info = /** @type {{ threadId: number, isMainThread: boolean }} */ (
				await pool.run(TARGET, "info", [])
			);
			expect(info.isMainThread).toBe(false);
			expect(info.threadId).toBeGreaterThan(0);

			const error = /** @type {Error & { code?: string }} */ (
				await pool.run(TARGET, "fail", []).catch((err) => err)
			);
			expect(error.message).toBe("boom");
			expect(error.code).toBe("E_BOOM");
			const partial = /** @type {Error & { code?: string }} */ (
				await pool.run(TARGET, "failWithFunction", []).catch((err) => err)
			);
			expect(partial.message).toBe("boom");
			expect(partial.code).toBe("E_BOOM");
			await expect(pool.run(TARGET, "throwString", [])).rejects.toThrow(
				"not an error"
			);
			await expect(pool.run(TARGET, "returnFunction", [])).rejects.toThrow(
				/could not be cloned|can not be cloned/
			);
			// @ts-expect-error a function cannot be cloned
			await expect(pool.run(TARGET, "add", [() => {}, 1])).rejects.toThrow(
				/could not be cloned|can not be cloned/
			);
			expect(await pool.run(TARGET, "add", [2, 3])).toBe(5);
		});

		it("bounds concurrency and queues the rest", async () => {
			const pool = createThreadPool({ max: 2 });
			const first = pool.run(TARGET, "sleep", [100]);
			const second = pool.run(TARGET, "sleep", [100]);
			const third = pool.run(TARGET, "sleep", [100]);
			expect(pool.stats).toMatchObject({ workers: 2, running: 2, queued: 1 });
			await Promise.all([first, second, third]);
			expect(pool.stats.completed).toBeGreaterThanOrEqual(3);
		});

		it("warms up a target count, retires idle workers and releases", async () => {
			// a short timeout would let the first warm thread retire before the
			// second is ready, so shorten it only once both are idle
			const pool = createThreadPool({ idleTimeout: 1000 });
			await pool.warmup([TARGET], 2);
			expect(pool.stats.workers).toBe(2);
			expect(pool.stats.idle).toBe(2);

			// restart the idle timers with the short timeout
			pool.setKeepAlive(true);
			pool.options.idleTimeout = 20;
			pool.setKeepAlive(false);
			await waitFor(() => pool.stats.workers === 0);

			await pool.warmup([TARGET], 1);
			expect(pool.stats.workers).toBe(1);
			await pool.release();
			expect(pool.stats.workers).toBe(0);
			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
		});

		it("does not preload with a zero target", async () => {
			const pool = createThreadPool({ max: 1 });
			await pool.warmup([SLOW], 0);
			expect(pool.stats.workers).toBe(0);
		});

		it("retires a released worker when its preload settles", async () => {
			const pool = createThreadPool({ max: 1, idleTimeout: 5000 });
			const preloading = pool.warmup([SLOW], 1);
			await pool.release();
			expect(pool.stats.workers).toBe(0);
			await preloading;
		});

		it("runs a queued call while a loader job waits on the main thread", async () => {
			const pool = createThreadPool({ max: 1, loaderParallelJobs: 1 });
			const result = pool.runJob(TARGET, "rpcAdd", [2, 3], {
				parallelJobs: 1,
				rpc: (method, args) => pool.run(TARGET, method, args)
			});

			await expect(result).resolves.toBe(5);
		});

		it("keeps a job blocked until every awaited rpc settles", async () => {
			const pool = createThreadPool({ max: 1, loaderParallelJobs: 1 });
			const result = pool.runJob(TARGET, "rpcTwo", [], {
				rpc: async (method) => {
					// both are in flight before "fast" settles; "nested" then
					// calls back into the full pool
					await new Promise((resolve) =>
						setTimeout(resolve, method === "fast" ? 10 : 50)
					);
					if (method === "fast") return 1;
					return pool.run(TARGET, "add", [1, 2]);
				}
			});
			/** @type {NodeJS.Timeout | undefined} */
			let timer;
			const stalled = new Promise((_resolve, reject) => {
				timer = setTimeout(() => reject(new Error("stalled")), 2000);
			});
			try {
				await expect(Promise.race([result, stalled])).resolves.toEqual([1, 3]);
			} finally {
				clearTimeout(timer);
			}
		});

		it("dispatches a call queued while warming up", async () => {
			const pool = createThreadPool({ max: 1 });
			const warming = pool.warmup([SLOW], 1);
			const result = pool.run(TARGET, "add", [1, 2]);
			expect(await result).toBe(3);
			await warming;
		});

		it("waits for a preload before ending", async () => {
			const pool = createThreadPool({ max: 1 });
			const preloading = pool.warmup([SLOW], 1);
			await pool.end();
			await expect(preloading).resolves.toBeUndefined();
			expect(pool.stats.workers).toBe(0);
		});

		it("falls back for a non-finite parallelJobs", async () => {
			const pool = createThreadPool({ max: 1, loaderParallelJobs: 1 });
			const result = pool.runJob(TARGET, "rpcAdd", [2, 3], {
				parallelJobs: NaN,
				rpc: (method, args) => pool.run(TARGET, method, args)
			});

			await expect(result).resolves.toBe(5);
		});

		it("keeps the pool usable after releasing during a call", async () => {
			const pool = createThreadPool({ max: 1 });
			const running = pool.run(TARGET, "sleep", [50]);
			await pool.release();
			await running;
			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
		});

		it("uses the loader timeout after a loader job", async () => {
			const pool = createThreadPool({
				max: 1,
				idleTimeout: 5000,
				loaderPoolTimeout: 20
			});
			await pool.runJob(TARGET, "add", [1, 2], {
				rpc: () => undefined
			});
			await waitFor(() => pool.stats.workers === 0);
		});

		it("waits for an inline call before ending", async () => {
			const pool = createPool({ max: 0 });
			const running = pool.run(TARGET, "sleep", [50]);
			await pool.end();
			expect(await running).toBe(50);
			expect(pool.stats.workers).toBe(0);
		});

		it("rejects a warmup whose module throws", async () => {
			const pool = createThreadPool({ max: 1 });
			await expect(pool.warmup([BROKEN], 1)).rejects.toThrow("broken module");
			expect(pool.stats.workers).toBe(1);
		});

		it("rejects or replaces the calls of a thread that crashed", async () => {
			const pool = createThreadPool({ max: 1 });
			await expect(pool.run(TARGET, "crash", [])).rejects.toThrow(
				/exited with code 3 during crash/
			);
			expect(pool.stats.crashed).toBe(1);
			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
		});

		it("rejects a missing export on a thread", async () => {
			const pool = createThreadPool({ max: 1 });
			await expect(pool.run(TARGET, "missing", [])).rejects.toThrow(
				/has no export named missing/
			);
			await pool.end();
		});

		it("queues a loader job behind a plain call on the last thread", async () => {
			const pool = createThreadPool({ max: 1 });
			const plain = pool.run(TARGET, "sleep", [50]);
			const loader = pool.runJob(TARGET, "rpcAdd", [2, 3], {
				rpc: (method, args) =>
					method === "add"
						? /** @type {number} */ (args[0]) + /** @type {number} */ (args[1])
						: undefined
			});
			expect(await plain).toBe(50);
			expect(await loader).toBe(5);
			await pool.end();
		});

		it("spreads concurrent loader jobs over the pool", async () => {
			const pool = createThreadPool({ max: 4 });
			const jobs = [];
			for (let i = 0; i < 12; i++) {
				jobs.push(pool.runJob(TARGET, "info", [], { rpc: () => undefined }));
			}
			const infos = await Promise.all(jobs);
			/** @type {Map<number, number>} */
			const perThread = new Map();
			for (const info of infos) {
				const { threadId } = /** @type {{ threadId: number }} */ (info);
				perThread.set(threadId, (perThread.get(threadId) || 0) + 1);
			}
			expect(perThread.size).toBe(4);
			for (const count of perThread.values()) expect(count).toBe(3);
			await pool.end();
		});

		it("rejects a non-Error throw the same way inline and on a thread", async () => {
			const inline = createPool({ max: 0 });
			const remote = createThreadPool();
			const inlineError = await inline
				.run(TARGET, "throwPlain", [])
				.catch((/** @type {ThrownValue} */ error) => error);
			const remoteError = await remote
				.run(TARGET, "throwPlain", [])
				.catch((/** @type {ThrownValue} */ error) => error);
			for (const error of [inlineError, remoteError]) {
				const plain = /** @type {Error & { code?: number }} */ (error);
				expect(plain).toBeInstanceOf(Error);
				expect(plain.message).toBe("plain");
				expect(plain.name).toBe("Error");
				expect(plain.code).toBe(7);
			}
			await inline.end();
			await remote.end();
		});

		it("rejects warmup while ending or when a module cannot load", async () => {
			const pool = createThreadPool({ max: 1 });
			const ending = pool.end();
			await expect(pool.warmup([TARGET])).rejects.toThrow(
				/The worker pool is ending/
			);
			await ending;

			const failing = createThreadPool({ max: 1 });
			await expect(
				failing.warmup([
					path.join(__dirname, "../fixtures/worker-pool/missing.js")
				])
			).rejects.toThrow(/Cannot find module/);
			await failing.end();
		});

		it("treats a non-finite warmup count as the pool max", async () => {
			const pool = createThreadPool({ max: 2 });
			await pool.warmup([TARGET], NaN);
			expect(pool.stats.workers).toBe(2);
			await pool.end();
		});

		it("spawns a replacement while workers are exiting", async () => {
			const pool = createThreadPool({ max: 1 });
			await pool.warmup([TARGET], 1);
			const releasing = pool.release();
			await pool.warmup([TARGET], 1);
			await releasing;
			expect(pool.stats.workers).toBe(1);
			await pool.end();
		});

		it("rejects queued calls when ending", async () => {
			const pool = createThreadPool({ max: 1 });
			const running = pool.run(TARGET, "sleep", [50]);
			const queued = pool.run(TARGET, "add", [1, 2]);
			const ending = pool.end();
			await expect(queued).rejects.toThrow(/The worker pool is ending/);
			await ending;
			expect(await running).toBe(50);
		});

		it("ends gracefully or forcefully", async () => {
			const pool = createThreadPool({ max: 1 });
			const running = pool.run(TARGET, "sleep", [50]);
			await pool.end();
			expect(await running).toBe(50);
			expect(pool.stats.workers).toBe(0);
			expect(pool.end()).toBe(pool.end());

			const force = createThreadPool({ max: 1 });
			const blocked = force.run(TARGET, "sleep", [5000]);
			await force.end({ force: true });
			await expect(blocked).rejects.toThrow(
				/exited with code \d+ during sleep/
			);
		});
	});

	describeThreads("WorkerChild", () => {
		/**
		 * @typedef {import("../../lib/worker/WorkerChild")} WorkerChild
		 * @typedef {import("worker_threads").MessagePort} MessagePort
		 * @typedef {import("../../lib/worker/protocol").WorkerToMainMessage} WorkerToMainMessage
		 * @typedef {import("../../lib/worker/protocol").RpcMessage} RpcMessage
		 * @typedef {import("../../lib/worker/protocol").ErrorResponseMessage} ErrorResponseMessage
		 */

		/**
		 * @returns {{ child: WorkerChild, port2: MessagePort, next: () => Promise<WorkerToMainMessage> }} a started child
		 */
		const createChild = () => {
			const { MessageChannel } = require("worker_threads");
			const WorkerChild = require("../../lib/worker/WorkerChild");
			const { port1, port2 } = new MessageChannel();
			/** @type {WorkerToMainMessage[]} */
			const received = [];
			/** @type {((message: WorkerToMainMessage) => void)[]} */
			const waiting = [];
			port2.on("message", (/** @type {WorkerToMainMessage} */ message) => {
				const resolve = waiting.shift();
				if (resolve) resolve(message);
				else received.push(message);
			});
			/**
			 * @returns {Promise<WorkerToMainMessage>} the next message
			 */
			const next = () =>
				received.length > 0
					? Promise.resolve(
							/** @type {WorkerToMainMessage} */ (received.shift())
						)
					: new Promise((resolve) => {
							waiting.push(resolve);
						});

			const child = new WorkerChild(port1, 7);
			child.start();
			return { child, port2, next };
		};

		/**
		 * @param {MessagePort} port2 the main side of the port
		 * @returns {Promise<void>} settled when the port closed
		 */
		const closed = (port2) =>
			new Promise((resolve) => {
				port2.once("close", resolve);
			});

		it("answers preload and call messages over a port", async () => {
			const { port2, next } = createChild();

			port2.postMessage({ type: "preload", id: 1, modules: [TARGET] });
			expect(await next()).toEqual({ type: "preloaded", id: 1, ok: true });
			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "add",
				args: [1, 2],
				rpc: false
			});
			expect(await next()).toEqual({
				type: "response",
				id: 2,
				ok: true,
				value: 3
			});
			port2.postMessage({ type: "close" });
			await closed(port2);
		});

		it("routes rpc calls to the main thread", async () => {
			const { port2, next } = createChild();

			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "rpcAdd",
				args: [2, 3],
				rpc: true
			});
			const rpc = /** @type {RpcMessage} */ (await next());
			expect(rpc).toMatchObject({
				type: "rpc",
				jobId: 2,
				method: "add",
				args: [2, 3]
			});
			port2.postMessage({
				type: "rpc-result",
				jobId: 2,
				callId: rpc.callId,
				ok: true,
				value: 5
			});
			expect(await next()).toEqual({
				type: "response",
				id: 2,
				ok: true,
				value: 5
			});
			port2.postMessage({ type: "close" });
			await closed(port2);
		});

		it("drops a pending rpc when its arguments cannot be cloned", async () => {
			const { child, port2, next } = createChild();

			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "rpcCloneFail",
				args: [],
				rpc: true
			});
			const response = /** @type {ErrorResponseMessage} */ (await next());
			expect(response).toMatchObject({ type: "response", id: 2, ok: false });
			expect(response.error.message).toMatch(
				/could not be cloned|can not be cloned/
			);
			expect(child._rpc.size).toBe(0);
			port2.postMessage({ type: "close" });
			await closed(port2);
		});

		it("does not throw from a fire-and-forget rpc with cloned arguments", async () => {
			const { child, port2, next } = createChild();

			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "rpcNoWaitCloneFail",
				args: [],
				rpc: true
			});
			expect(await next()).toEqual({
				type: "response",
				id: 2,
				ok: true,
				value: "sent"
			});
			expect(child._rpc.size).toBe(0);
			port2.postMessage({ type: "close" });
			await closed(port2);
		});

		it("rejects pending rpc calls when the job finishes", async () => {
			const { child, port2, next } = createChild();

			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "rpcPending",
				args: [],
				rpc: true
			});
			expect(await next()).toMatchObject({ type: "rpc", jobId: 2 });
			expect(await next()).toEqual({
				type: "response",
				id: 2,
				ok: true,
				value: "pending"
			});
			expect(child._rpc.size).toBe(0);
			port2.postMessage({ type: "close" });
			await closed(port2);
		});

		it("rejects pending rpc calls when the port closes", async () => {
			const { child, port2, next } = createChild();

			port2.postMessage({
				type: "job",
				id: 2,
				module: TARGET,
				method: "rpcHold",
				args: [],
				rpc: true
			});
			expect(await next()).toMatchObject({ type: "rpc", jobId: 2 });
			child.close();
			expect(child._rpc.size).toBe(0);
			await closed(port2);
		});
	});

	describeThreads("reuse", () => {
		/** @typedef {import("../../lib/worker/Worker")<{ info: () => { threadId: number } }>} InfoWorker */

		/**
		 * @param {number} ms milliseconds
		 * @returns {Promise<void>} settled after `ms`
		 */
		const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

		/**
		 * @param {import("../../lib/Compiler")} compiler the compiler
		 * @returns {Promise<void>} settled when the build finished
		 */
		const run = (compiler) =>
			new Promise((resolve, reject) => {
				compiler.run((err) => (err ? reject(err) : resolve()));
			});

		/**
		 * @param {import("../../lib/Compiler")} compiler the compiler
		 * @returns {Promise<void>} settled when the compiler closed
		 */
		const close = (compiler) =>
			new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve()));
			});

		/**
		 * A compiler whose build calls two worker modules with a gap between them.
		 * @param {(compiler: import("../../lib/Compiler")) => Promise<void>} task runs in processAssets
		 * @returns {import("../../lib/Compiler")} the compiler
		 */
		const createCompiler = (task) => {
			const { createFsFromVolume, Volume } = require("memfs");
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: { max: 1 } },
				plugins: [
					{
						apply(compiler) {
							compiler.hooks.thisCompilation.tap("test", (compilation) => {
								compilation.hooks.processAssets.tapPromise("test", () =>
									task(compiler)
								);
							});
						}
					}
				]
			});
			compiler.outputFileSystem =
				/** @type {import("../../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			return compiler;
		};

		it("keeps idle threads alive while on and lets them retire when off", async () => {
			const pool = createPool({ max: 1, idleTimeout: 20 });
			try {
				pool.setKeepAlive(true);
				const first = /** @type {{ threadId: number }} */ (
					await pool.run(TARGET, "info")
				);
				await sleep(100);
				expect(pool.stats.workers).toBe(1);
				const second = /** @type {{ threadId: number }} */ (
					await pool.run(OTHER, "info")
				);
				expect(second.threadId).toBe(first.threadId);
				expect(pool.stats.spawned).toBe(1);
				pool.setKeepAlive(false);
				await waitFor(() => pool.stats.workers === 0);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("releases only the idle threads that ran nothing since the mark", async () => {
			const pool = createPool({ max: 2 });
			try {
				await pool.warmup([TARGET], 2);
				expect(pool.stats.workers).toBe(2);
				// nothing ran: no thread is known to be surplus
				pool.releaseUnused();
				expect(pool.stats.workers).toBe(2);
				await pool.run(TARGET, "add", [1, 2]);
				pool.releaseUnused();
				await waitFor(() => pool.stats.workers === 1);
				pool.markUnused();
				pool.releaseUnused();
				expect(pool.stats.workers).toBe(1);
				expect(pool.stats.spawned).toBe(2);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("stops keeping threads alive once watching closes", async () => {
			const compiler = createCompiler(async (compiler) => {
				await compiler.worker(TARGET).run("add", 1, 2);
			});
			const farm = /** @type {import("../../lib/worker/WorkerFarm")} */ (
				compiler._workerFarm
			);
			try {
				/** @type {import("../../lib/watch/Watching") | undefined} */
				let watching;
				await new Promise((resolve, reject) => {
					watching = compiler.watch({}, (err) =>
						err ? reject(err) : resolve(undefined)
					);
				});
				// still watching: kept alive for the next rebuild
				expect(farm._keepAlive).toBe(true);
				await new Promise((resolve) =>
					/** @type {import("../../lib/watch/Watching")} */ (watching).close(
						() => resolve(undefined)
					)
				);
				expect(farm._keepAlive).toBe(false);
			} finally {
				await close(compiler);
			}
		});

		it("gives every task of a build the same threads, whatever the gaps", async () => {
			/** @type {number[]} */
			const threadIds = [];
			const compiler = createCompiler(async (compiler) => {
				const worker = /** @type {InfoWorker} */ (compiler.worker(TARGET));
				// an idle gap longer than the timeout must not cost a respawn
				worker._pool.options.idleTimeout = 20;
				threadIds.push((await worker.run("info")).threadId);
				await sleep(100);
				const other = /** @type {InfoWorker} */ (compiler.worker(OTHER));
				threadIds.push((await other.run("info")).threadId);
			});
			try {
				await run(compiler);
				const pool = /** @type {import("../../lib/worker/WorkerPool")} */ (
					compiler._getWorkerPool()
				);
				expect(new Set(threadIds).size).toBe(1);
				expect(pool.stats.spawned).toBe(1);
				// after `done` the idle timer runs again
				await waitFor(() => pool.stats.workers === 0);
			} finally {
				await close(compiler);
			}
		});
	});

	describeThreads("shared pool", () => {
		/**
		 * @param {import("../../declarations/WebpackOptions").WebpackOptions=} options extra options
		 * @returns {import("../../lib/Compiler")} the compiler
		 */
		const createThreaded = (options) => {
			const webpack = require("../../lib/webpack");
			return /** @type {import("../../lib/Compiler")} */ (
				webpack({
					entry: "data:text/javascript,1",
					experiments: { threads: { max: 1 } },
					...options
				})
			);
		};

		/**
		 * @param {import("../../lib/Compiler")} compiler the compiler
		 * @returns {Promise<void>} settled when it closed
		 */
		const close = (compiler) =>
			new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve()));
			});

		it("gives every compiler of the process one pool, ended by the last close", async () => {
			const a = createThreaded();
			const b = createThreaded();
			const pool = a.worker(TARGET)._pool;

			expect(b.worker(TARGET)._pool).toBe(pool);
			await close(a);
			// the other compiler still runs on the shared threads
			expect(pool.ending).toBe(false);
			expect(await b.worker(TARGET).run("add", 1, 2)).toBe(3);
			await close(b);
			expect(pool.ending).toBe(true);
			// a new compiler starts a fresh pool
			const c = createThreaded();
			expect(c.worker(TARGET)._pool).not.toBe(pool);
			await close(c);
		});

		it("grows the shared max to the largest compiler's and keeps threads while any builds", async () => {
			const a = createThreaded();
			const b = createThreaded({ experiments: { threads: { max: 2 } } });
			const pool = a.worker(TARGET)._pool;
			b.worker(TARGET);
			const cores = Math.max(
				(typeof require("os").availableParallelism === "function"
					? require("os").availableParallelism()
					: (require("os").cpus() || { length: 1 }).length) - 1,
				0
			);

			expect(pool.options.max).toBe(Math.min(2, cores));
			const farmA = /** @type {import("../../lib/worker/WorkerFarm")} */ (
				a._workerFarm
			);
			const farmB = /** @type {import("../../lib/worker/WorkerFarm")} */ (
				b._workerFarm
			);
			farmA.setKeepAlive(true);
			farmB.setKeepAlive(false);
			expect(pool._keepAlive).toBe(true);
			farmA.setKeepAlive(false);
			expect(pool._keepAlive).toBe(false);
			await close(a);
			await close(b);
		});

		it("keeps an inline compiler (max: 0) off the shared threads", async () => {
			const a = createThreaded();
			const inline = createThreaded({ experiments: { threads: { max: 0 } } });

			expect(inline.worker(TARGET)._pool).not.toBe(a.worker(TARGET)._pool);
			expect(inline.worker(TARGET)._pool.options.max).toBe(0);
			await close(a);
			await close(inline);
		});

		it("runs a MultiCompiler on at most max threads in total", async () => {
			const { createFsFromVolume, Volume } = require("memfs");
			const webpack = require("../../lib/webpack");
			/**
			 * @param {string} name the config name
			 * @returns {import("../../declarations/WebpackOptions").WebpackOptions} the config
			 */
			const config = (name) => ({
				name,
				entry: "data:text/javascript,1",
				experiments: { threads: { max: 2 } },
				plugins: [
					{
						/**
						 * @param {import("../../lib/Compiler")} compiler the compiler
						 */
						apply(compiler) {
							compiler.hooks.thisCompilation.tap("test", (compilation) => {
								compilation.hooks.processAssets.tapPromise("test", async () => {
									const worker = compiler.worker(TARGET);
									await Promise.all(
										[1, 2, 3, 4].map((n) => worker.run("sleep", n * 5))
									);
								});
							});
						}
					}
				]
			});
			const multi = webpack([config("a"), config("b"), config("c")]);
			for (const compiler of multi.compilers) {
				compiler.outputFileSystem =
					/** @type {import("../../").OutputFileSystem} */ (
						/** @type {unknown} */ (createFsFromVolume(new Volume()))
					);
			}
			const pool = multi.compilers[0].worker(TARGET)._pool;
			await new Promise((resolve, reject) => {
				multi.run((err) => (err ? reject(err) : resolve(undefined)));
			});

			for (const compiler of multi.compilers) {
				expect(compiler.worker(TARGET)._pool).toBe(pool);
			}
			expect(pool.stats.spawned).toBeLessThanOrEqual(pool.options.max);
			await new Promise((resolve, reject) => {
				multi.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(pool.ending).toBe(true);
		});
	});

	describeThreads("numWorkers", () => {
		/** @typedef {import("../../lib/worker/Worker")<{ info: () => { threadId: number, isMainThread: boolean } }>} InfoWorker */

		const os = require("os");

		const cores = Math.max(
			// eslint-disable-next-line n/no-unsupported-features/node-builtins
			(typeof os.availableParallelism === "function"
				? // eslint-disable-next-line n/no-unsupported-features/node-builtins
					os.availableParallelism()
				: (os.cpus() || { length: 1 }).length) - 1,
			0
		);
		const itWithCores = cores > 0 ? it : it.skip;

		/**
		 * @param {number} ms milliseconds
		 * @returns {Promise<void>} settled after `ms`
		 */
		const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

		/**
		 * @param {import("../../declarations/WebpackOptions").WebpackOptions=} options extra options
		 * @param {((compiler: import("../../lib/Compiler")) => Promise<void>)=} task runs in processAssets
		 * @returns {import("../../lib/Compiler")} the compiler
		 */
		const createCompiler = (options, task) => {
			const { createFsFromVolume, Volume } = require("memfs");
			const webpack = require("../../lib/webpack");
			const compiler = /** @type {import("../../lib/Compiler")} */ (
				webpack({
					entry: "data:text/javascript,1",
					plugins: task
						? [
								{
									/**
									 * @param {import("../../lib/Compiler")} compiler the compiler
									 */
									apply(compiler) {
										compiler.hooks.thisCompilation.tap(
											"test",
											(compilation) => {
												compilation.hooks.processAssets.tapPromise("test", () =>
													task(compiler)
												);
											}
										);
									}
								}
							]
						: [],
					...options
				})
			);
			compiler.outputFileSystem =
				/** @type {import("../../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
			return compiler;
		};

		/**
		 * @param {import("../../lib/Compiler")} compiler the compiler
		 * @returns {Promise<void>} settled when it closed
		 */
		const close = (compiler) =>
			new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve()));
			});

		itWithCores("runs on threads without experiments.threads", async () => {
			const compiler = createCompiler();
			try {
				const threaded = /** @type {InfoWorker} */ (
					compiler.worker(TARGET, { numWorkers: 1 })
				);
				const inline = /** @type {InfoWorker} */ (compiler.worker(TARGET));

				expect(threaded).not.toBe(inline);
				expect(compiler.worker(TARGET, { numWorkers: 1 })).toBe(threaded);
				expect((await threaded.run("info")).isMainThread).toBe(false);
				expect(await inline.run("info")).toEqual(callerThread());
				expect(
					await /** @type {InfoWorker} */ (
						compiler.worker(TARGET, { numWorkers: 0 })
					).run("info")
				).toEqual(callerThread());
				// the configured pool is still the inline one
				expect(compiler._getWorkerPool()).toBe(inline._pool);
			} finally {
				await close(compiler);
			}
		});

		itWithCores(
			"shares the threads of compilers with experiments.threads",
			async () => {
				const forced = createCompiler();
				const configured = createCompiler({
					experiments: { threads: { max: 1 } }
				});
				try {
					const pool = configured.worker(TARGET)._pool;

					expect(forced.worker(TARGET, { numWorkers: 1 })._pool).toBe(pool);
					// configured threads ignore numWorkers
					expect(configured.worker(TARGET, { numWorkers: 4 })._pool).toBe(pool);
					expect(pool.options.max).toBe(1);
					await close(configured);
					expect(pool.ending).toBe(false);
				} finally {
					await close(configured);
					await close(forced);
				}
			}
		);

		itWithCores(
			"keeps the threads for the build and retires them after",
			async () => {
				/** @type {number[]} */
				const threadIds = [];
				const compiler = createCompiler(undefined, async (compiler) => {
					const worker = /** @type {InfoWorker} */ (
						compiler.worker(TARGET, { numWorkers: 1 })
					);
					// created mid-build: the gap must not cost a respawn
					worker._pool.options.idleTimeout = 20;
					threadIds.push((await worker.run("info")).threadId);
					await sleep(100);
					const other = /** @type {InfoWorker} */ (
						compiler.worker(OTHER, { numWorkers: 1 })
					);
					threadIds.push((await other.run("info")).threadId);
				});
				try {
					await new Promise((resolve, reject) => {
						compiler.run((err) => (err ? reject(err) : resolve(undefined)));
					});
					const pool = compiler.worker(TARGET, { numWorkers: 1 })._pool;

					expect(new Set(threadIds).size).toBe(1);
					expect(pool.stats.spawned).toBe(1);
					await waitFor(() => pool.stats.workers === 0);
				} finally {
					await close(compiler);
				}
			}
		);

		itWithCores("keeps the threads between watch rebuilds", async () => {
			const compiler = createCompiler(undefined, async (compiler) => {
				await compiler.worker(TARGET, { numWorkers: 1 }).run("add", 1, 2);
			});
			try {
				/** @type {import("../../lib/watch/Watching") | undefined} */
				let watching;
				await new Promise((resolve, reject) => {
					watching = compiler.watch({}, (err) =>
						err ? reject(err) : resolve(undefined)
					);
				});
				const pool = compiler.worker(TARGET, { numWorkers: 1 })._pool;

				expect(pool._keepAlive).toBe(true);
				await new Promise((resolve) =>
					/** @type {import("../../lib/watch/Watching")} */ (watching).close(
						() => resolve(undefined)
					)
				);
				expect(pool._keepAlive).toBe(false);
			} finally {
				await close(compiler);
			}
		});

		it("rejects an invalid numWorkers", async () => {
			const compiler = createCompiler();
			try {
				expect(() =>
					compiler.worker(TARGET, {
						numWorkers: /** @type {number} */ (/** @type {unknown} */ ("2"))
					})
				).toThrow(/numWorkers/);
				expect(() => compiler.worker(TARGET, { numWorkers: -1 })).toThrow(
					/numWorkers/
				);
			} finally {
				await close(compiler);
			}
		});
	});

	describeThreads("recycling", () => {
		/** @typedef {{ threadId: number }} Info */

		/**
		 * @param {WorkerPool} pool the pool
		 * @param {string} module the module
		 * @param {number} times how many calls, one after another
		 * @returns {Promise<number[]>} the thread of each call
		 */
		const infoTimes = async (pool, module, times) => {
			/** @type {number[]} */
			const threadIds = [];
			for (let i = 0; i < times; i++) {
				threadIds.push(
					/** @type {Info} */ (await pool.run(module, "info")).threadId
				);
			}
			return threadIds;
		};

		it("replaces a thread worn by one module for a call of another at max", async () => {
			const pool = createPool({ max: 1 });
			try {
				const [first] = await infoTimes(pool, TARGET, 8);
				const other = /** @type {Info} */ (await pool.run(OTHER, "info"));

				expect(other.threadId).not.toBe(first);
				expect(pool.stats.spawned).toBe(2);
				expect(pool.stats.workers).toBe(1);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("reuses a thread that ran few calls of another module", async () => {
			const pool = createPool({ max: 1 });
			try {
				const [first] = await infoTimes(pool, TARGET, 3);
				const other = /** @type {Info} */ (await pool.run(OTHER, "info"));

				expect(other.threadId).toBe(first);
				expect(pool.stats.spawned).toBe(1);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("replaces a worn thread for a loader job of another module at max", async () => {
			const pool = createPool({ max: 1 });
			try {
				const [first] = await infoTimes(pool, TARGET, 8);
				const other = /** @type {Info} */ (
					await pool.runJob(OTHER, "info", [], { rpc: () => undefined })
				);

				expect(other.threadId).not.toBe(first);
				expect(pool.stats.spawned).toBe(2);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("lets a worn thread finish its preload before replacing it", async () => {
			const pool = createPool({ max: 1 });
			try {
				const [first] = await infoTimes(pool, TARGET, 7);
				// the preload reaches the thread while its eighth call runs, so
				// the thread is idle with the preload in flight once that settles
				const eighth = pool.run(TARGET, "info");
				const warming = pool.warmup([SLOW], 1);
				const other = /** @type {Info} */ (await pool.run(OTHER, "info"));

				await eighth;

				await expect(warming).resolves.toBeUndefined();
				expect(other.threadId).not.toBe(first);
				expect(pool.stats.spawned).toBe(2);
			} finally {
				await pool.end({ force: true });
			}
		});

		it("starts a thread below max and keeps the worn one for its module", async () => {
			const pool = createPool({ max: 2 });
			try {
				const [first] = await infoTimes(pool, TARGET, 8);
				const other = /** @type {Info} */ (await pool.run(OTHER, "info"));
				const again = /** @type {Info} */ (await pool.run(TARGET, "info"));

				expect(other.threadId).not.toBe(first);
				expect(again.threadId).toBe(first);
				expect(pool.stats.spawned).toBe(2);
			} finally {
				await pool.end({ force: true });
			}
		});
	});
});
