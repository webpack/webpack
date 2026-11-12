"use strict";

require("../helpers/warmup-webpack");

const IdleFileCachePlugin = require("../../lib/cache/IdleFileCachePlugin");

describe("IdleFileCachePlugin", () => {
	describe("store hook", () => {
		it("should not queue asset identifiers for caching", () => {
			const strategy = {
				store: () => {
					throw new Error("strategy.store should not be called for asset identifiers");
				}
			};
			const plugin = new IdleFileCachePlugin(strategy, 1000, 1000, 1000);

			const compiler = {
				cache: {
					hooks: {
						store: {
							tap: (options, fn) => {
								compiler._storeFn = fn;
							}
						}
					}
				}
			};

			plugin.apply(compiler);

			compiler._storeFn("|asset/./src/image.png", "etag", {});
			compiler._storeFn("Compilation/assets|./src/image.png", "etag", {});

			expect(plugin._pendingIdleTasks.size).toBe(0);
		});

		it("should queue normal identifiers for caching", () => {
			let stored = false;
			const strategy = {
				store: () => {
					stored = true;
				}
			};
			const plugin = new IdleFileCachePlugin(strategy, 1000, 1000, 1000);

			const compiler = {
				cache: {
					hooks: {
						store: {
							tap: (options, fn) => {
								compiler._storeFn = fn;
							}
						}
					}
				}
			};

			plugin.apply(compiler);

			compiler._storeFn("module/normal|./src/index.js", "etag", {});

			expect(plugin._pendingIdleTasks.size).toBe(1);
			const task = plugin._pendingIdleTasks.get("module/normal|./src/index.js");
			task();
			expect(stored).toBe(true);
		});
	});
});
