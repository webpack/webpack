"use strict";

const path = require("path");
const Worker = require("../../lib/worker/Worker");
const WorkerPool = require("../../lib/worker/WorkerPool");

const TARGET = path.resolve(__dirname, "../fixtures/worker-pool/worker.js");
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

const describeThreads = WorkerPool.isThreadingAvailable()
	? describe
	: describe.skip;

describe("WorkerPool", () => {
	describe("inline", () => {
		it("runs calls on the main thread with max: 0", async () => {
			const pool = createPool({ max: 0 });

			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
			const { threadId, isMainThread } = require("worker_threads");
			const info = await pool.run(TARGET, "info", []);
			// inline work runs on the caller's thread; under the Bun test
			// runner that thread is a jest worker, so compare, do not assume 0.
			expect(info).toEqual({ threadId, isMainThread });

			await expect(pool.run(TARGET, "missing", [])).rejects.toThrow(
				`${TARGET} has no export named missing`
			);
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

		it("wraps an inline clone failure like the remote path", async () => {
			const WorkerJobCloneError = require("../../lib/errors/WorkerJobCloneError");
			const pool = createPool({ max: 0 });

			const argsError = await pool
				.run(TARGET, "add", [() => {}, 1])
				.catch((/** @type {unknown} */ error) => error);
			expect(argsError).toBeInstanceOf(WorkerJobCloneError);

			const resultError = await pool
				.run(TARGET, "returnFunction", [])
				.catch((/** @type {unknown} */ error) => error);
			expect(resultError).not.toBeInstanceOf(WorkerJobCloneError);
			expect(/** @type {{ message?: string }} */ (resultError).message).toMatch(
				/clone/i
			);
		});
	});

	describe("compiler.worker", () => {
		it("throws while experiments.threads is off", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({ entry: "data:text/javascript,1" });

			expect(() => compiler.worker(TARGET)).toThrow(
				/experiments\.threads option/
			);
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(() => compiler.worker(TARGET)).toThrow(
				/experiments\.threads option/
			);
		});

		it("returns one facade per path and follows the pool max", async () => {
			const os = require("os");
			const webpack = require("../../lib/webpack");
			const cpus =
				typeof os.availableParallelism === "function"
					? os.availableParallelism()
					: (os.cpus() || { length: 1 }).length;

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
			expect(defaults._pool.options.max).toBe(Math.max(cpus - 1, 0));
			await defaults._pool.end();

			const two = workerFor({ max: 2.5 });
			expect(two._pool.options.max).toBe(2);
			await two._pool.end();

			const inline = workerFor({ max: 0 });
			const { threadId, isMainThread } = require("worker_threads");
			expect(await inline.run("info")).toEqual({ threadId, isMainThread });
			await inline.release();
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
			const typedAsync =
				/** @type {import("../../lib/worker/Worker")<{
					version: string,
					addAsync: (a: number, b: number) => Promise<number>
				}>} */ (worker);
			expect(await typedAsync.run("addAsync", 1, 2)).toBe(3);
			await worker._pool.end();
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
			expect(WorkerPool.getWorkerPool(compiler)).toBeUndefined();
		});

		it("does not end the root pool when a child compiler closes", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			const worker = compiler.worker(TARGET);
			const compilation = compiler.newCompilation(compiler.newCompilationParams());
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
			await Promise.all(pools.splice(0).map((pool) => pool.end({ force: true })));
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
			const pool = createThreadPool({ idleTimeout: 20 });
			await pool.warmup([TARGET], 2);
			expect(pool.stats.workers).toBe(2);
			expect(pool.stats.idle).toBe(2);

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

		it("spreads concurrent loader jobs over the pool", async () => {
			const pool = createThreadPool({ max: 4 });
			const jobs = [];
			for (let i = 0; i < 12; i++) {
				jobs.push(
					pool.runJob(TARGET, "info", [], { rpc: () => undefined })
				);
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
			await expect(blocked).rejects.toThrow(/exited with code \d+ during sleep/);
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
			expect(response.error.message).toMatch(/could not be cloned|can not be cloned/);
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
});
