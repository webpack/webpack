/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class MemoryCachePlugin {
	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Map<string, { etag: string, data: any }>} */
		const cache = new Map();
		compiler.cache.hooks.store.tap(
			"MemoryCachePlugin",
			(identifier, etag, data) => {
				cache.set(identifier, { etag, data });
			}
		);
		compiler.cache.hooks.get.tap(
			"MemoryCachePlugin",
			(identifier, etag, gotHandlers) => {
				const cacheEntry = cache.get(identifier);
				if (cacheEntry !== undefined && cacheEntry.etag === etag) {
					return cacheEntry.data;
				}
				gotHandlers.push((result, callback) => {
					if (result !== undefined) {
						cache.set(identifier, { etag, data: result });
					}
					return callback();
				});
			}
		);
	}
}
module.exports = MemoryCachePlugin;
