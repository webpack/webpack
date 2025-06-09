"use strict";

const MemoryCachePlugin = require("../lib/cache/MemoryCachePlugin");

describe("MemoryCachePlugin", () => {
	it("should store all entries when storeFilter returns true", () => {
		// storeFilter always returns true, so all entries should be stored in cache
		const plugin = new MemoryCachePlugin({ storeFilter: () => true });
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tap: jest.fn() },
					shutdown: { tap: jest.fn() }
				}
			}
		};
		plugin.apply(fakeCompiler);
		// The first argument to .tap is the plugin options, the second is the handler function. We want the handler.
		const store = fakeCompiler.cache.hooks.store.tap.mock.calls[0][1];
		// Spy on all Map cache writes
		const setSpy = jest.fn();
		const originalSet = Map.prototype.set;
		Map.prototype.set = function (key, value) {
			setSpy(key, value);
			return originalSet.call(this, key, value);
		};

		try {
			store("foo.js", "etag1", { some: "data" }); // should always call cache.set
			expect(setSpy).toHaveBeenCalledWith("foo.js", {
				etag: "etag1",
				data: { some: "data" }
			});
		} finally {
			Map.prototype.set = originalSet;
		}
	});

	it("should skip storing entries when storeFilter returns false", () => {
		// storeFilter returns false for 'skip.js', so it should not be stored
		const plugin = new MemoryCachePlugin({
			storeFilter: identifier => identifier !== "skip.js"
		});
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tap: jest.fn() },
					shutdown: { tap: jest.fn() }
				}
			}
		};

		// Spy on all Map cache writes
		const setSpy = jest.fn();
		const originalSet = Map.prototype.set;
		Map.prototype.set = function (key, value) {
			setSpy(key, value);
			return originalSet.call(this, key, value);
		};

		try {
			plugin.apply(fakeCompiler);
			const store = fakeCompiler.cache.hooks.store.tap.mock.calls[0][1];
			store("skip.js", "etag2", { some: "data" }); // should NOT call cache.set
			store("other.js", "etag3", { some: "data" }); // should call cache.set

			expect(setSpy).toHaveBeenCalledWith("other.js", {
				etag: "etag3",
				data: { some: "data" }
			});
			expect(setSpy).not.toHaveBeenCalledWith("skip.js", expect.anything());
		} finally {
			Map.prototype.set = originalSet;
		}
	});

	it("should skip storing in get handler if storeFilter returns false", () => {
		// storeFilter returns false for 'skip.js', so result should not be stored in get handler
		const plugin = new MemoryCachePlugin({
			storeFilter: identifier => identifier !== "skip.js"
		});
		const fakeCompiler = {
			cache: {
				hooks: {
					store: { tap: jest.fn() },
					get: { tap: jest.fn() },
					shutdown: { tap: jest.fn() }
				}
			}
		};

		// Spy on all Map cache writes
		const setSpy = jest.fn();
		const originalSet = Map.prototype.set;
		Map.prototype.set = function (key, value) {
			setSpy(key, value);
			return originalSet.call(this, key, value);
		};

		try {
			plugin.apply(fakeCompiler);
			const get = fakeCompiler.cache.hooks.get.tap.mock.calls[0][1];
			// Simulate a cache miss for skip.js, should NOT store result
			const skipHandlers = [];
			get("skip.js", "etag4", skipHandlers);
			// Call the first handler to simulate the cache miss result being provided to the plugin's get handler
			skipHandlers[0]({ some: "data" }, () => {});
			expect(setSpy).not.toHaveBeenCalledWith("skip.js", expect.anything());

			// Simulate a cache miss for other.js, should store result
			const otherHandlers = [];
			get("other.js", "etag5", otherHandlers);
			otherHandlers[0]({ some: "data" }, () => {});
			expect(setSpy).toHaveBeenCalledWith("other.js", {
				etag: "etag5",
				data: { some: "data" }
			});
		} finally {
			Map.prototype.set = originalSet;
		}
	});
});
