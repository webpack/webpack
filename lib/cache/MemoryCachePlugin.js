/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");
const { getKnownCacheType } = require("../CacheFacade");

/** @typedef {import("../Cache").Data} Data */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../CacheFacade").CacheFilter} CacheFilter */
/** @typedef {import("../CacheFacade").CacheFilterEntry} CacheFilterEntry */
/** @typedef {import("../Compiler")} Compiler */

class MemoryCachePlugin {
	/**
	 * @param {object} options options
	 * @param {CacheFilter=} options.storeFilter filter deciding which cache entries are stored (false skips)
	 */
	constructor({ storeFilter } = {}) {
		this.storeFilter = storeFilter;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const storeFilter = this.storeFilter;
		/**
		 * Whether an entry of a known item type should be stored (always stores
		 * non-filterable entries such as plugin caches).
		 * @param {string} identifier cache entry identifier
		 * @param {Data} data cache entry data
		 * @returns {boolean} true to store
		 */
		const shouldStore = (identifier, data) => {
			if (!storeFilter) return true;
			const type = getKnownCacheType(identifier);
			return (
				type === undefined ||
				storeFilter(/** @type {CacheFilterEntry} */ ({ type, data }))
			);
		};
		/** @type {Map<string, { etag: Etag | null, data: Data } | null>} */
		const cache = new Map();
		compiler.cache.hooks.store.tap(
			{ name: "MemoryCachePlugin", stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
				if (!shouldStore(identifier, data)) return;
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
					if (result === undefined) {
						cache.set(identifier, null);
					} else if (shouldStore(identifier, result)) {
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
