/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @typedef {import("../Cache").Data} Data */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compiler")} Compiler */

class MemoryCachePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Map<string, { etag: Etag | null, data: Data } | null>} */
		const cache = new Map();
		compiler.cache.hooks.store.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
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
					// Compared by identity first: the same source object yields the same
					// lazy etag, so a warm hit costs no hashing. A plugin that re-emits an
					// asset builds a fresh `Source` every compilation though, and a `null`
					// here is a *definitive* miss that stops the file cache being asked —
					// so fall back to the value the rest of the cache compares etags by.
					if (cacheEntry.etag === etag) return cacheEntry.data;
					return `${cacheEntry.etag}` === `${etag}` ? cacheEntry.data : null;
				}
				gotHandlers.push((result, callback) => {
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
