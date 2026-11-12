"use strict";

const { WebpackError } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Module} Module */
/** @typedef {NonNullable<import("../../../../").Compilation["moduleMemCaches"]>} MemCaches */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// Retaining the graph bypasses the cache restoration this case exercises.
	incremental: false,
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
			 * resolves to no module; in the third, the request resolves to a module
			 * kept from before. Either way its parent must not keep its memo cache.
			 * @param {Compiler} compiler the compiler
			 */
			apply(compiler) {
				compiler.hooks.normalModuleFactory.tap("DropCachedModule", (nmf) => {
					nmf.hooks.beforeResolve.tap("DropCachedModule", (data) => {
						if (data.request !== "./unchanged-module") return;
						const build = Number(currentWatchStep.step);
						if (build === 1) return false;
						if (build === 2) data.request = "./shared";
					});
				});
				/** @type {ReturnType<MemCaches["get"]>} */
				let indexMemCache;
				compiler.hooks.compilation.tap("DropCachedModule", (compilation) => {
					compilation.hooks.seal.tap("DropCachedModule", () => {
						if (!compiler.watchMode) return;
						const build = Number(currentWatchStep.step);
						const index = /** @type {Module} */ (
							[...compilation.modules].find((m) =>
								m.identifier().endsWith("index.js")
							)
						);
						const memCaches = /** @type {MemCaches} */ (
							compilation.moduleMemCaches
						);
						const memCache = memCaches.get(index);
						if (build > 0 && memCache === indexMemCache) {
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
						if (
							currentWatchStep.step === "1" &&
							identifier.endsWith("unchanged-module.js")
						) {
							return callback(null, null);
						}
						callback();
					}
				);
			}
		}
	]
};
