"use strict";

const Cache = require("../lib/Cache");
const IdleFileCachePlugin = require("../lib/cache/IdleFileCachePlugin");

/** @typedef {import("../lib/Compiler")} Compiler */

/** @typedef {{ store: jest.Mock, restore: jest.Mock, storeBuildDependencies: jest.Mock, afterAllStored: jest.Mock, clear: jest.Mock }} FakeStrategy */

/**
 * @returns {FakeStrategy} a strategy recording what the plugin asks it to persist
 */
const createStrategy = () => ({
	store: jest.fn(() => Promise.resolve()),
	restore: jest.fn(() => Promise.resolve()),
	storeBuildDependencies: jest.fn(() => Promise.resolve()),
	afterAllStored: jest.fn(() => Promise.resolve()),
	clear: jest.fn()
});

/**
 * @param {FakeStrategy} strategy cache strategy
 * @param {number=} idleTimeout timeout
 * @returns {{ compiler: Compiler, warnings: string[] }} the minimum of a compiler this plugin taps
 */
const applyPlugin = (strategy, idleTimeout = 60000) => {
	/** @type {string[]} */
	const warnings = [];
	const compiler = /** @type {EXPECTED_ANY} */ ({
		cache: new Cache(),
		hooks: { done: { tap: () => {} } },
		getInfrastructureLogger: () => ({
			log: () => {},
			debug: () => {},
			warn: (/** @type {string} */ message) => warnings.push(message)
		})
	});
	new IdleFileCachePlugin(
		/** @type {EXPECTED_ANY} */ (strategy),
		idleTimeout,
		idleTimeout,
		idleTimeout
	).apply(compiler);
	return { compiler, warnings };
};

/**
 * Emits `beforeExit` and lets the flush it starts settle.
 * @returns {Promise<void>} resolves once the started promise chain has run
 */
const emitBeforeExit = async () => {
	process.emit("beforeExit", 0);
	for (let i = 0; i < 5; i++) await Promise.resolve();
};

/**
 * @param {() => boolean} condition what to wait for
 * @returns {Promise<void>} resolves as soon as the condition holds
 */
const waitFor = async (condition) => {
	for (let i = 0; i < 100 && !condition(); i++) {
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	expect(condition()).toBe(true);
};

describe("IdleFileCachePlugin", () => {
	/** @type {number} */
	let listenersBefore;

	beforeEach(() => {
		listenersBefore = process.listenerCount("beforeExit");
	});

	afterEach(() => {
		expect(process.listenerCount("beforeExit")).toBe(listenersBefore);
	});

	it("stores pending items when the process exits without `compiler.close()`", async () => {
		const strategy = createStrategy();
		const { compiler } = applyPlugin(strategy);

		compiler.cache.store("a", null, "data a", () => {});
		compiler.cache.store("b", null, "data b", () => {});
		compiler.cache.beginIdle();

		await emitBeforeExit();

		expect(strategy.store.mock.calls.map(([identifier]) => identifier)).toEqual(
			["a", "b"]
		);
		expect(strategy.afterAllStored).toHaveBeenCalledTimes(1);

		await new Promise((resolve) => {
			compiler.cache.shutdown(resolve);
		});
	});

	it("does nothing on exit when there is nothing pending", async () => {
		const strategy = createStrategy();
		const { compiler } = applyPlugin(strategy);

		compiler.cache.beginIdle();
		await emitBeforeExit();

		expect(strategy.store).not.toHaveBeenCalled();
		expect(strategy.afterAllStored).not.toHaveBeenCalled();

		await new Promise((resolve) => {
			compiler.cache.shutdown(resolve);
		});
	});

	it("warns instead of rejecting when storing on exit fails", async () => {
		const strategy = createStrategy();
		strategy.store.mockRejectedValue(new Error("disk is full"));
		const { compiler, warnings } = applyPlugin(strategy);

		compiler.cache.store("a", null, "data a", () => {});
		compiler.cache.beginIdle();

		await emitBeforeExit();

		expect(warnings).toEqual([
			"Storing cache before exit failed: disk is full"
		]);
		expect(strategy.afterAllStored).not.toHaveBeenCalled();

		await new Promise((resolve) => {
			compiler.cache.shutdown(resolve);
		});
	});

	it("shares one listener between compilers and drops it on shutdown", async () => {
		const first = applyPlugin(createStrategy());
		const second = applyPlugin(createStrategy());

		for (let i = 0; i < 20; i++) {
			first.compiler.cache.beginIdle();
			await new Promise((resolve) => {
				first.compiler.cache.endIdle(resolve);
			});
		}
		first.compiler.cache.beginIdle();
		second.compiler.cache.beginIdle();

		expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);

		await new Promise((resolve) => {
			first.compiler.cache.shutdown(resolve);
		});

		expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);

		await new Promise((resolve) => {
			second.compiler.cache.shutdown(resolve);
		});
	});

	it("drops the listener once idle storing has written everything", async () => {
		const strategy = createStrategy();
		const { compiler } = applyPlugin(strategy, 1);

		compiler.cache.store("a", null, "data a", () => {});
		compiler.cache.beginIdle();

		expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);

		await waitFor(() => strategy.afterAllStored.mock.calls.length > 0);
		await waitFor(
			() => process.listenerCount("beforeExit") === listenersBefore
		);
		expect(strategy.store).toHaveBeenCalledTimes(1);

		await new Promise((resolve) => {
			compiler.cache.shutdown(resolve);
		});
	});
});
