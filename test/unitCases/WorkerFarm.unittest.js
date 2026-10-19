"use strict";

const path = require("path");
const WorkerFarm = require("../../lib/util/worker/WorkerFarm");
const Handle = require("../../lib/util/worker/Handle");
const { TransferResult } = require("../../lib/util/worker/protocol");

const TARGET = path.resolve(__dirname, "../fixtures/worker-farm/target.js");
const BROKEN = path.resolve(__dirname, "../fixtures/worker-farm/broken.js");

/**
 * @param {string} method export name
 * @returns {{ module: string, method: string }} a target in the fixture module
 */
const target = (method) => ({ module: TARGET, method });

/** @typedef {import("../../lib/util/worker/WorkerFarm").FarmOptions} FarmOptions */
/** @typedef {[string, string, unknown[] | undefined]} LogCall */

/**
 * @typedef {object} Info
 * @property {boolean} isWorker context.isWorker
 * @property {number | undefined} workerId context.workerId
 * @property {number} initCount times `init` ran in that module instance
 */

/**
 * @param {Partial<FarmOptions>=} options overrides
 * @returns {WorkerFarm} a farm
 */
const createFarm = (options) =>
	new WorkerFarm({
		max: 2,
		min: 0,
		idleTimeout: 1000,
		strictClone: true,
		...options
	});

const describeThreads = WorkerFarm.isThreadingAvailable()
	? describe
	: describe.skip;

describe("WorkerFarm", () => {
	describe("inline", () => {
		it("runs every call on the main thread with max: 0", async () => {
			const farm = createFarm({ max: 0 });
			/** @type {LogCall[]} */
			const logs = [];
			farm.hooks.log.tap("test", (name, type, args) => {
				logs.push([name, type, args]);
			});

			expect(await farm.run(target("add"), [1, 2])).toBe(3);
			const info = /** @type {Info} */ (await farm.run(target("info"), []));
			expect(info.isWorker).toBe(false);
			expect(info.workerId).toBeUndefined();

			const shared = farm.share({ a: 42 });
			expect(await farm.run(target("readShared"), [shared.ref, "a"])).toBe(42);
			await shared.dispose();
			await expect(
				farm.run(target("readShared"), [shared.ref, "a"])
			).rejects.toThrow(`No shared reference ${shared.ref}`);

			const handle = farm.expose((value) => value + 1);
			expect(await farm.run(target("callBack"), [handle, 4])).toBe(50);
			await expect(
				farm.run(target("callBack"), [new Handle(999, undefined), 4])
			).rejects.toThrow("No exposed function with handle 999");
			const exposed = await farm.run(target("exposeBack"), []);
			expect(Handle.isHandle(exposed)).toBe(true);
			expect(await farm.run(target("callModule"), [TARGET, 1, 2])).toBe(3);
			expect(await farm.run(target("notify"), [handle])).toBe("sent");
			await expect(farm.run(target("throwString"), [])).rejects.toBe(
				"not an error"
			);

			expect(await farm.run(target("log"), ["hello"])).toBe("logged");
			expect(logs).toEqual([["worker-farm/test", "info", ["hello"]]]);

			const buffer = /** @type {ArrayBuffer} */ (
				await farm.run(target("buffer"), [])
			);
			expect(new Uint8Array(buffer)[0]).toBe(7);

			await expect(farm.run(target("add"), [() => {}, 1])).rejects.toThrow(
				/could not be cloned/
			);
			await expect(farm.run(target("missing"), [])).rejects.toThrow(
				`${TARGET} has no export named missing`
			);

			await farm.run(target("remember"), ["key", 1]);
			await farm.broadcast(target("clearCache"), []);
			expect(await farm.run(target("cacheSize"), [])).toBe(0);
			await farm.warmup([TARGET]);

			expect(farm.stats).toMatchObject({
				workers: 0,
				idle: 0,
				queued: 0,
				running: 0,
				spawned: 0,
				crashed: 0
			});
			expect(farm.stats.completed).toBeGreaterThan(0);

			await farm.end();
			await expect(farm.run(target("add"), [1, 2])).rejects.toThrow(
				"The farm is ending"
			);
			await expect(farm.broadcast(target("add"), [])).rejects.toThrow(
				"The farm is ending"
			);
			await expect(farm.warmup([TARGET])).rejects.toThrow("The farm is ending");
			expect(farm.end()).toBe(farm.end());
		});

		it("rejects an encoding other than clone and a value the port cannot copy", () => {
			const farm = createFarm({ max: 0 });
			expect(() => farm.share({}, { encoding: "webpack" })).toThrow(
				'encoding "webpack" is not supported yet'
			);
			expect(() => farm.share(() => {})).toThrow(/could not be cloned/);
		});

		it("passes values through without strictClone", async () => {
			const farm = createFarm({ max: 0, strictClone: false });
			const fn = () => 1;
			expect(await farm.run(target("add"), [fn, ""])).toBe(`${fn}`);
		});
	});

	describe("experiments.threads", () => {
		it("gives a pass the farm only when threads and that pass are on", async () => {
			const os = require("os");
			const webpack = require("../../lib/webpack");
			const { getWorkerFarm } = require("../../lib/index").experiments;
			const cores = Math.max(os.cpus().length - 1, 0);

			/**
			 * @param {import("../../declarations/WebpackOptions").Experiments["threads"]} threads the option
			 * @returns {WorkerFarm | undefined} what the minimize pass gets
			 */
			const farmFor = (threads) =>
				getWorkerFarm(
					webpack({ entry: "data:text/javascript,1", experiments: { threads } }),
					"minimize"
				);

			expect(farmFor(undefined)).toBeUndefined();
			expect(farmFor(false)).toBeUndefined();
			expect(farmFor({ passes: { minimize: false } })).toBeUndefined();

			for (const [threads, max] of /** @type {[import("../../declarations/WebpackOptions").Experiments["threads"], number][]} */ ([
				[true, cores],
				[{}, cores],
				[{ max: 3 }, 3],
				[{ max: 2.5, passes: { minimize: true } }, 2],
				[{ max: 0 }, 0]
			])) {
				const farm = /** @type {WorkerFarm} */ (farmFor(threads));
				expect(farm.options.max).toBe(max);
				await farm.end();
			}

			const inline = /** @type {WorkerFarm} */ (farmFor({ max: 0 }));
			const info = /** @type {Info} */ (await inline.run(target("info"), []));
			expect(info.isWorker).toBe(false);
			await inline.end();
		});
	});

	describe("Handle", () => {
		it("is recognized after structured clone and round-trips through the serializer", async () => {
			const { buffersSerializer } = require("../../lib/util/serialization");

			const handle = new Handle(3, 2);
			expect(Handle.isHandle({ ...handle })).toBe(true);
			expect(Handle.isHandle(null)).toBe(false);
			expect(Handle.isHandle({ id: 3 })).toBe(false);

			const restored = /** @type {Handle} */ (
				await buffersSerializer.deserialize(
				await buffersSerializer.serialize(handle, {}),
				{}
			)
			);
			expect(restored).toBeInstanceOf(Handle);
			expect(restored.id).toBe(3);
			expect(restored.workerId).toBe(2);
		});
	});

	describeThreads("threads", () => {
		/** @type {WorkerFarm[]} */
		const farms = [];

		/**
		 * @param {Partial<FarmOptions>=} options overrides
		 * @returns {WorkerFarm} a farm ended after the test
		 */
		const createThreadFarm = (options) => {
			const farm = createFarm(options);
			farms.push(farm);
			return farm;
		};

		afterEach(async () => {
			await Promise.all(farms.splice(0).map((farm) => farm.end({ force: true })));
		});

		it("runs calls, shares values and calls back into the main thread", async () => {
			const farm = createThreadFarm();
			/** @type {LogCall[]} */
			const logs = [];
			farm.hooks.log.tap("test", (name, type, args) => {
				logs.push([name, type, args]);
			});
			/** @type {number[]} */
			const spawned = [];
			farm.hooks.workerSpawned.tap("test", (workerId) => spawned.push(workerId));

			const add = farm.bind(target("add"));
			expect(await add([1, 2])).toBe(3);
			const info = /** @type {Info} */ (await farm.run(target("info"), []));
			expect(info.isWorker).toBe(true);
			expect(info.initCount).toBe(1);
			expect(spawned).toEqual([info.workerId]);

			const shared = farm.share({ a: 42 });
			expect(await farm.run(target("readShared"), [shared.ref, "a"])).toBe(42);
			await shared.dispose();
			await expect(
				farm.run(target("readShared"), [shared.ref, "a"])
			).rejects.toThrow(`No shared reference ${shared.ref}`);

			const handle = farm.expose((value) => value + 1);
			expect(await farm.run(target("callBack"), [handle, 4])).toBe(50);
			const failing = farm.expose(() => {
				throw new Error("main failed");
			});
			await expect(farm.run(target("callBack"), [failing, 4])).rejects.toThrow(
				"main failed"
			);
			expect(await farm.run(target("notify"), [failing])).toBe("sent");

			expect(await farm.run(target("log"), ["hello"])).toBe("logged");
			expect(logs).toContainEqual(["worker-farm/test", "info", ["hello"]]);

			const buffer = /** @type {ArrayBuffer} */ (
				await farm.run(target("buffer"), [])
			);
			expect(new Uint8Array(buffer)[0]).toBe(7);

			const error = /** @type {Error & { code?: string }} */ (
				await farm.run(target("fail"), []).catch((err) => err)
			);
			expect(error.message).toBe("boom");
			expect(error.code).toBe("E_BOOM");
			await expect(farm.run(target("add"), [() => {}, 1])).rejects.toThrow(
				/could not be cloned/
			);
			await expect(farm.run(target("returnFunction"), [])).rejects.toThrow(
				/could not be cloned/
			);
			await expect(farm.run(target("missing"), [])).rejects.toThrow(
				`${TARGET} has no export named missing`
			);

			await new Promise((resolve) => {
				setTimeout(resolve, 50);
			});
			expect(logs.filter(([, type]) => type === "error")).toHaveLength(1);
		});

		it("never puts a concurrency: 1 call beside other calls", async () => {
			const farm = createThreadFarm();
			const exclusive = farm.bind(target("sleep"), { concurrency: 1 });
			const shared = farm.bind(target("sleep"), { concurrency: 4 });

			const [first, second, third] = await Promise.all([
				shared([100]),
				exclusive([100]),
				shared([100])
			]);
			expect(second).not.toBe(first);
			expect(second).not.toBe(third);
			expect(farm.stats.spawned).toBe(2);
		});

		it("routes equal worker keys to one thread and broadcasts to every thread", async () => {
			const farm = createThreadFarm();
			const remember = farm.bind(target("remember"), {
				workerKey: (args) => /** @type {string} */ (args[0])
			});
			await Promise.all([
				farm.run(target("sleep"), [50]),
				farm.run(target("sleep"), [50])
			]);
			expect(await remember(["a", 1])).toBe(1);
			expect(await remember(["a", 2])).toBe(2);
			expect(await remember(["a", 3])).toBe(3);

			await farm.broadcast(target("clearCache"), []);
			expect(
				await Promise.all([
					farm.run(target("cacheSize"), []),
					farm.run(target("cacheSize"), [])
				])
			).toEqual([0, 0]);
		});

		it("rejects or retries the calls of a thread that crashed", async () => {
			const farm = createThreadFarm();
			/** @type {number[]} */
			const exited = [];
			farm.hooks.workerExited.tap("test", (workerId, code) => {
				exited.push(code);
			});

			await expect(farm.run(target("crash"), [])).rejects.toThrow(
				/exited with code 3 during crash/
			);
			await expect(
				farm.run(target("crash"), [], { retries: 1 })
			).rejects.toThrow(/exited with code 3 during crash/);
			expect(farm.stats.crashed).toBe(3);
			expect(exited).toEqual([3, 3, 3]);
			expect(await farm.run(target("add"), [1, 2])).toBe(3);
		});

		(typeof AbortController === "function" ? it : it.skip)(
			"rejects aborted calls",
			async () => {
				const farm = createThreadFarm({ max: 1 });
				const aborted = new AbortController();
				aborted.abort();
				await expect(
					farm.run(target("add"), [1, 2], { signal: aborted.signal })
				).rejects.toThrow("The call was aborted");

				const running = new AbortController();
				const queued = new AbortController();
				const first = farm.run(target("sleep"), [100], {
					signal: running.signal
				});
				const second = farm.run(target("sleep"), [100], {
					signal: queued.signal
				});
				expect(farm.stats.queued).toBe(1);
				queued.abort();
				running.abort();
				await expect(first).rejects.toThrow("The call was aborted");
				await expect(second).rejects.toThrow("The call was aborted");
				expect(farm.stats.queued).toBe(0);
			}
		);

		it("warms threads up, retires idle ones and ends gracefully", async () => {
			const farm = createThreadFarm({ idleTimeout: 50 });
			await farm.warmup([TARGET]);
			expect(farm.stats).toMatchObject({ workers: 2, idle: 2 });
			const info = /** @type {Info} */ (await farm.run(target("info"), []));
			expect(info.initCount).toBe(1);

			await new Promise((resolve) => {
				setTimeout(resolve, 300);
			});
			expect(farm.stats.workers).toBe(0);

			const running = farm.run(target("sleep"), [100]);
			const queued = createThreadFarm({ max: 1 });
			const blocked = queued.run(target("sleep"), [100]);
			const waiting = expect(queued.run(target("add"), [1, 2])).rejects.toThrow(
				"The farm is ending"
			);
			await Promise.all([farm.end(), queued.end()]);
			expect(await running).toBeGreaterThan(0);
			expect(await blocked).toBeGreaterThan(0);
			await waiting;
			expect(farm.stats.workers).toBe(0);
		});

		it("keeps min threads through the idle timeout", async () => {
			const farm = createThreadFarm({ min: 1, max: 1, idleTimeout: 20 });
			await farm.run(target("add"), [1, 2]);
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			expect(farm.stats.workers).toBe(1);
		});

		it("rejects warmup when a preloaded module throws", async () => {
			const farm = createThreadFarm({ max: 1 });
			await expect(farm.warmup([BROKEN])).rejects.toThrow(
				/exited with code 1 before it was ready: broken module/
			);
		});

		it("rejects in-flight calls when forced to end", async () => {
			const farm = createThreadFarm({ max: 1 });
			const running = farm.run(target("sleep"), [5000], { retries: 1 });
			await farm.end({ force: true });
			await expect(running).rejects.toThrow(/exited with code \d+ during sleep/);
		});

		it("gives each compiler one farm, logs through it and ends it on close", async () => {
			const webpack = require("../../lib/webpack");
			const { getWorkerFarm } = WorkerFarm;
			const compiler = webpack({
				entry: "data:text/javascript,1",
				experiments: { threads: true }
			});
			/** @type {LogCall[]} */
			const logs = [];
			compiler.hooks.infrastructureLog.tap("test", (name, type, args) => {
				logs.push([name, type, args]);
				return true;
			});

			const farm = /** @type {WorkerFarm} */ (
				getWorkerFarm(compiler, "minimize")
			);
			expect(getWorkerFarm(compiler, "minimize")).toBe(farm);
			expect(await farm.run(target("log"), ["from thread"])).toBe("logged");
			expect(logs).toEqual([["worker-farm/test", "info", ["from thread"]]]);

			await /** @type {Promise<void>} */ (
				new Promise((resolve, reject) => {
				compiler.close((err) => (err ? reject(err) : resolve()));
			})
			);
			expect(farm.stats.workers).toBe(0);
			const next = /** @type {WorkerFarm} */ (
				getWorkerFarm(compiler, "minimize")
			);
			expect(next).not.toBe(farm);
			await next.end();
		});
	});

	describeThreads("WorkerChild", () => {
		it("answers the farm's messages over a port", async () => {
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
			 * @returns {Promise<EXPECTED_ANY>} the next message from the child
			 */
			const next = () =>
				received.length > 0
					? Promise.resolve(received.shift())
					: new Promise((resolve) => {
							waiting.push(resolve);
						});

			new WorkerChild(port1, 7).start();
			port2.postMessage({ type: "init", workerId: 7, preload: [TARGET] });
			expect(await next()).toEqual({ type: "ready", workerId: 7 });

			port2.postMessage({ type: "share", ref: 1, encoding: "clone", value: { a: 1 } });
			port2.postMessage({
				type: "call",
				id: 1,
				target: target("readShared"),
				args: [1, "a"]
			});
			expect(await next()).toEqual({ type: "response", id: 1, ok: true, value: 1 });

			port2.postMessage({ type: "unshare", ref: 1 });
			port2.postMessage({
				type: "call",
				id: 2,
				target: target("readShared"),
				args: [1, "a"]
			});
			const unshared = await next();
			expect(unshared).toMatchObject({ id: 2, ok: false });
			expect(unshared.error).toMatchObject({
				message: "No shared reference 1",
				workerId: 7
			});

			port2.postMessage({ type: "call", id: 3, target: target("exposeBack"), args: [] });
			const exposed = await next();
			expect(exposed.value).toEqual({ kind: Handle.HANDLE_KIND, id: 1, workerId: 7 });
			port2.postMessage({ type: "call", id: 4, target: { handle: 1 }, args: [21] });
			expect(await next()).toMatchObject({ id: 4, ok: true, value: 42 });
			port2.postMessage({ type: "call", id: 5, target: { handle: 9 }, args: [] });
			expect((await next()).error.message).toBe(
				"No exposed function with handle 9"
			);

			port2.postMessage({
				type: "call",
				id: 6,
				target: target("callBack"),
				args: [new Handle(5, undefined), 2]
			});
			const callMain = await next();
			expect(callMain).toEqual({
				type: "call",
				id: 1,
				target: { handle: 5 },
				args: [2]
			});
			port2.postMessage({ type: "response", id: 99, ok: true, value: 0 });
			port2.postMessage({ type: "response", id: 1, ok: true, value: 3 });
			expect(await next()).toMatchObject({ id: 6, ok: true, value: 30 });

			port2.postMessage({
				type: "call",
				id: 7,
				target: target("callBack"),
				args: [new Handle(5, undefined), 2]
			});
			const failingCall = await next();
			port2.postMessage({
				type: "response",
				id: failingCall.id,
				ok: false,
				error: { name: "Error", message: "main failed" }
			});
			expect((await next()).error.message).toBe("main failed");

			port2.postMessage({ type: "call", target: target("fail"), args: [] });
			port2.postMessage({ type: "call", target: target("add"), args: [1, 2] });
			port2.postMessage({ type: "call", id: 8, target: target("log"), args: ["x"] });
			const entries = [];
			let message = await next();
			while (message.type === "log") {
				entries.push(...message.entries);
				message = await next();
			}
			expect(message).toMatchObject({ id: 8, ok: true, value: "logged" });
			expect(entries).toHaveLength(2);
			expect(entries[0]).toMatchObject({
				name: "webpack.WorkerChild",
				type: "error"
			});
			expect(entries[0].args[0]).toMatch(/boom/);
			expect(entries[1]).toEqual({
				name: "worker-farm/test",
				type: "info",
				args: ["x"]
			});

			port2.postMessage({ type: "call", id: 9, target: target("buffer"), args: [] });
			const buffer = await next();
			expect(new Uint8Array(buffer.value)[0]).toBe(7);
			port2.postMessage({ type: "call", id: 10, target: target("missing"), args: [] });
			expect((await next()).error.message).toBe(
				`${TARGET} has no export named missing`
			);
			port2.postMessage({
				type: "call",
				id: 11,
				target: target("returnFunction"),
				args: []
			});
			expect((await next()).error.message).toMatch(/could not be cloned/);
			port2.postMessage({ type: "call", id: 12, target: target("throwString"), args: [] });
			expect((await next()).error).toEqual({
				name: "Error",
				message: "not an error",
				workerId: 7
			});
			port2.postMessage({
				type: "call",
				id: 13,
				target: target("notify"),
				args: [new Handle(5, undefined)]
			});
			expect(await next()).toEqual({
				type: "call",
				target: { handle: 5 },
				args: []
			});
			expect(await next()).toMatchObject({ id: 13, ok: true, value: "sent" });

			port2.postMessage({ type: "close" });
			await new Promise((resolve) => {
				port2.once("close", resolve);
			});
		});
	});
});
