"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	module: {
		unsafeCache: true
	},
	plugins: [
		{
			/**
			 * Answers the second build's lookup of one module with nothing, as a
			 * cache that dropped it would, so the dependency the unsafe cache
			 * mapped to it misses and resolves again.
			 * @param {Compiler} compiler the compiler
			 */
			apply(compiler) {
				let build = 0;
				compiler.hooks.done.tap("DropCachedModule", () => {
					build++;
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
