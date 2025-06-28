"use strict";

const IdleFileCachePlugin = require("../lib/cache/IdleFileCachePlugin");

describe("IdleFileCachePlugin storeFilter", () => {
	it("should store all entries when storeFilter returns true", async () => {
		// Mock strategy with all required methods
		const strategy = {
			store: jest.fn(() => Promise.resolve()),
			afterAllStored: jest.fn(() => Promise.resolve())
		};

		// storeFilter always returns true, so all entries should be stored
		const plugin = new IdleFileCachePlugin(strategy, 100, 100, 100, () => true);
		// Fake compiler with mocked cache hooks
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tapPromise: jest.fn() },
					storeBuildDependencies: { tap: jest.fn() },
					shutdown: { tapPromise: jest.fn() },
					beginIdle: { tap: jest.fn() },
					endIdle: { tap: jest.fn() }
				}
			},
			hooks: { done: { tap: jest.fn() } }
		};

		plugin.apply(fakeCompiler);
		// Get the store handler registered by the plugin
		const store = fakeCompiler.cache.hooks.store.tap.mock.calls[0][1];
		// Simulate storing a cache entry
		await store("foo.js", "etag1", { some: "data" });
		// Simulate idle/shutdown to flush pending tasks (this is when strategy.store is called)
		const shutdown =
			fakeCompiler.cache.hooks.shutdown.tapPromise.mock.calls[0][1];
		await shutdown();
		// Assert that strategy.store was called with the expected arguments
		expect(strategy.store).toHaveBeenCalledWith("foo.js", "etag1", {
			some: "data"
		});
	});

	it("should skip storing entries when storeFilter returns false", async () => {
		// storeFilter returns false for 'skip.js', so it should not be stored
		const strategy = {
			store: jest.fn(() => Promise.resolve()),
			afterAllStored: jest.fn(() => Promise.resolve())
		};

		const plugin = new IdleFileCachePlugin(
			strategy,
			100,
			100,
			100,
			id => id !== "skip.js"
		);
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tapPromise: jest.fn() },
					storeBuildDependencies: { tap: jest.fn() },
					shutdown: { tapPromise: jest.fn() },
					beginIdle: { tap: jest.fn() },
					endIdle: { tap: jest.fn() }
				}
			},
			hooks: { done: { tap: jest.fn() } }
		};

		plugin.apply(fakeCompiler);
		const store = fakeCompiler.cache.hooks.store.tap.mock.calls[0][1];
		// Try to store 'skip.js' (should be filtered out)
		await store("skip.js", "etag2", { some: "data" });
		// Try to store 'other.js' (should be stored)
		await store("other.js", "etag3", { some: "data" });
		// Simulate idle/shutdown to flush pending tasks
		const shutdown =
			fakeCompiler.cache.hooks.shutdown.tapPromise.mock.calls[0][1];
		await shutdown();
		// Only 'other.js' should be stored
		expect(strategy.store).toHaveBeenCalledWith("other.js", "etag3", {
			some: "data"
		});
		// 'skip.js' should not be stored
		const calls = strategy.store.mock.calls.map(call => call[0]);
		expect(calls).not.toContain("skip.js");
	});

	it("should skip storing in get handler if storeFilter returns false", async () => {
		// storeFilter returns false for 'skip.js', so result should not be stored in get handler
		const strategy = {
			store: jest.fn(() => Promise.resolve()),
			restore: jest.fn(() => Promise.resolve(undefined)),
			afterAllStored: jest.fn(() => Promise.resolve())
		};

		const plugin = new IdleFileCachePlugin(
			strategy,
			100,
			100,
			100,
			id => id !== "skip.js"
		);
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tapPromise: jest.fn() },
					storeBuildDependencies: { tap: jest.fn() },
					shutdown: { tapPromise: jest.fn() },
					beginIdle: { tap: jest.fn() },
					endIdle: { tap: jest.fn() }
				}
			},
			hooks: { done: { tap: jest.fn() } }
		};

		plugin.apply(fakeCompiler);
		const get = fakeCompiler.cache.hooks.get.tapPromise.mock.calls[0][1];

		// Simulate a cache miss for skip.js, should NOT store result
		const skipHandlers = [];
		await get("skip.js", "etag4", skipHandlers);
		await skipHandlers[0]({ some: "data" }, () => {});

		// Simulate a cache miss for other.js, should store result
		const otherHandlers = [];
		await get("other.js", "etag5", otherHandlers);
		await otherHandlers[0]({ some: "data" }, () => {});

		// Simulate idle/shutdown to flush pending tasks
		const shutdown =
			fakeCompiler.cache.hooks.shutdown.tapPromise.mock.calls[0][1];
		await shutdown();
		// Only 'other.js' should be stored
		expect(strategy.store).toHaveBeenCalledWith("other.js", "etag5", {
			some: "data"
		});
		// Should not call strategy.store for skip.js
		const calls = strategy.store.mock.calls.map(call => call[0]);
		expect(calls).not.toContain("skip.js");
	});
});
