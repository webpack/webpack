"use strict";

const path = require("path");
const Worker = require("../../lib/util/worker/Worker");
const WorkerPool = require("../../lib/util/worker/WorkerPool");

const TARGET = path.resolve(__dirname, "../fixtures/worker-pool/worker.js");
const BROKEN = path.resolve(__dirname, "../fixtures/worker-pool/broken.js");

/** @typedef {import("../../lib/util/worker/WorkerPool").WorkerPoolOptions} WorkerPoolOptions */

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

const describeThreads = WorkerPool.isThreadingAvailable()
	? describe
	: describe.skip;

describe("WorkerPool", () => {
	describe("inline", () => {
		it("runs calls on the main thread with max: 0", async () => {
			const pool = createPool({ max: 0 });

			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
			const info = await pool.run(TARGET, "info", []);
			expect(info).toEqual({ threadId: 0, isMainThread: true });

			await expect(pool.run(TARGET, "missing", [])).rejects.toThrow(
				`${TARGET} has no export named missing`
			);
			await expect(pool.run(TARGET, "add", [() => {}, 1])).rejects.toThrow(
				/could not be cloned/
			);
			await expect(pool.run(TARGET, "returnFunction", [])).rejects.toThrow(
				/could not be cloned/
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
	});

	describe("compiler.worker", () => {
		it("returns undefined while experiments.threads is off", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({ entry: "data:text/javascript,1" });

			expect(compiler.worker(TARGET)).toBeUndefined();
			await new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve(undefined)));
			});
			expect(compiler.worker(TARGET)).toBeUndefined();
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
			 * @returns {import("../../lib/util/worker/Worker") | undefined} the facade
			 */
			const workerFor = (threads) => {
				const compiler = webpack({
					entry: "data:text/javascript,1",
					experiments: { threads }
				});
				return compiler.worker(TARGET);
			};

			const defaults = /** @type {import("../../lib/util/worker/Worker")} */ (
				workerFor(true)
			);
			expect(defaults).toBeInstanceOf(Worker);
			expect(defaults._pool.options.max).toBe(Math.max(cpus - 1, 0));
			await defaults._pool.end();

			const two = /** @type {import("../../lib/util/worker/Worker")} */ (
				workerFor({ max: 2.5 })
			);
			expect(two._pool.options.max).toBe(2);
			await two._pool.end();

			const inline = /** @type {import("../../lib/util/worker/Worker")} */ (
				workerFor({ max: 0 })
			);
			expect(await inline.run("info")).toEqual({
				threadId: 0,
				isMainThread: true
			});
			await inline.release();
		});

		it("keeps the factory after close and refuses new work", async () => {
			const webpack = require("../../lib/webpack");
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			const worker = /** @type {import("../../lib/util/worker/Worker")} */ (
				compiler.worker(TARGET)
			);

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
			await expect(pool.run(TARGET, "failWithFunction", [])).rejects.toThrow(
				"boom"
			);
			await expect(pool.run(TARGET, "throwString", [])).rejects.toThrow(
				"not an error"
			);
			await expect(pool.run(TARGET, "returnFunction", [])).rejects.toThrow(
				/could not be cloned/
			);
			await expect(pool.run(TARGET, "add", [() => {}, 1])).rejects.toThrow(
				/could not be cloned/
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

			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			expect(pool.stats.workers).toBe(0);

			await pool.warmup([TARGET], 1);
			expect(pool.stats.workers).toBe(1);
			await pool.release();
			expect(pool.stats.workers).toBe(0);
			expect(await pool.run(TARGET, "add", [1, 2])).toBe(3);
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
		it("answers preload and call messages over a port", async () => {
			const { MessageChannel } = require("worker_threads");
			const WorkerChild = require("../../lib/util/worker/WorkerChild");
			const { port1, port2 } = new MessageChannel();
			/** @type {EXPECTED_ANY[]} */
			const received = [];
			/** @type {((message: EXPECTED_ANY) => void)[]} */
			const waiting = [];
			port2.on("message", (message) => {
				const resolve = waiting.shift();
				if (resolve) resolve(message);
				else received.push(message);
			});
			/**
			 * @returns {Promise<EXPECTED_ANY>} the next message
			 */
			const next = () =>
				received.length > 0
					? Promise.resolve(received.shift())
					: new Promise((resolve) => {
							waiting.push(resolve);
						});

			new WorkerChild(port1, 7).start();
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
			await new Promise((resolve) => {
				port2.once("close", resolve);
			});
		});
	});
});
