/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @import { Data, Etag } from "../Cache" */
/** @import Compiler from "../Compiler" */

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
				// A recorded miss: the whole chain was asked for this identifier already.
				if (cacheEntry === null) return null;
				// Etags are compared by identity — a lazy one is interned per source
				// object, so equal content reached through a second object is a
				// different etag. Hashing to tell those apart would cost every hit what
				// laziness saves, so a mismatch falls through to the next stage instead:
				// the file cache compares etags by value and can still answer. Returning
				// `null` here would bail the hook and lose that (`Cache.get` maps it to
				// `undefined` regardless, so it buys the caller nothing).
				if (cacheEntry !== undefined && cacheEntry.etag === etag) {
					return cacheEntry.data;
				}
				gotHandlers.push((result, callback) => {
					if (result !== undefined) {
						cache.set(identifier, { etag, data: result });
					} else if (cacheEntry === undefined) {
						// Record the miss only for an identifier nothing was known about:
						// an entry reached with a different etag still answers its own.
						cache.set(identifier, null);
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
