"use strict";

const { WebpackError } = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Module} Module */
/** @typedef {NonNullable<import("../../../../").Compilation["moduleMemCaches"]>} MemCaches */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		cacheUnaffected: true
	},
	cache: {
		type: "memory"
	},
	module: {
		unsafeCache: true
	},
	plugins: [
		{
			/**
			 * In the second build, the cache drops one module and its request
			 * resolves to no module, so its parent must not keep its memo cache.
			 * @param {Compiler} compiler the compiler
			 */
			apply(compiler) {
				let build = 0;
				compiler.hooks.done.tap("DropCachedModule", () => {
					build++;
				});
				compiler.hooks.normalModuleFactory.tap("DropCachedModule", (nmf) => {
					nmf.hooks.beforeResolve.tap("DropCachedModule", (data) => {
						if (build === 1 && data.request === "./unchanged-module") {
							return false;
						}
					});
				});
				/** @type {ReturnType<MemCaches["get"]>} */
				let indexMemCache;
				compiler.hooks.compilation.tap("DropCachedModule", (compilation) => {
					compilation.hooks.seal.tap("DropCachedModule", () => {
						const index = /** @type {Module} */ (
							[...compilation.modules].find((m) =>
								m.identifier().endsWith("index.js")
							)
						);
						const memCaches = /** @type {MemCaches} */ (
							compilation.moduleMemCaches
						);
						const memCache = memCaches.get(index);
						if (build === 1 && memCache === indexMemCache) {
							compilation.errors.push(
								new WebpackError("index.js kept a stale memo cache")
							);
						}
						indexMemCache = memCache;
					});
				});
				compiler.cache.hooks.get.tapAsync(
					{ name: "DropCachedModule", stage: -100 },
					(identifier, etag, gotHandlers, callback) => {
						if (build === 1 && identifier.endsWith("unchanged-module.js")) {
							return callback(null, null);
						}
						callback();
					}
				);
			}
		}
	]
};
