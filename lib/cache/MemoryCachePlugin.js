/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Cache").Data} Data */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class MemoryCachePlugin {
	/**
	 * @param {(identifier: string, data: Data) => boolean} storeFilter Optional filter function for cache entries
	 */
	constructor(storeFilter) {
		this.storeFilter = storeFilter;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const storeFilter = this.storeFilter;
		/** @type {Map<string, { etag: Etag | null, data: Data } | null>} */
		const cache = new Map();

		compiler.cache.hooks.store.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
				if (storeFilter && !storeFilter(identifier, data)) {
					// Skip storing this cache entry if filter returns false
					return;
				}
				cache.set(identifier, { etag, data });
			}
		);

		compiler.cache.hooks.get.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, gotHandlers) => {
				const cacheEntry = cache.get(identifier);
				if (cacheEntry === null) {
					return null;
				} else if (cacheEntry !== undefined) {
					return cacheEntry.etag === etag ? cacheEntry.data : null;
				}
				gotHandlers.push((result, callback) => {
					if (storeFilter && !storeFilter(identifier, result)) {
						// Skip storing this cache entry if filter returns false
						return callback();
					}

					if (result === undefined) {
						cache.set(identifier, null);
					} else {
						cache.set(identifier, { etag, data: result });
					}
					return callback();
				});
			}
		);
		compiler.cache.hooks.shutdown.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			() => {
				cache.clear();
			}
		);
	}
}
module.exports = MemoryCachePlugin;
