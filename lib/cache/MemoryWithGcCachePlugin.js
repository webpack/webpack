/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");

/** @import { Data, Etag } from "../Cache" */
/** @import Compiler from "../Compiler" */

/**
 * Defines the memory with gc cache plugin options type used by this module.
 * @typedef {object} MemoryWithGcCachePluginOptions
 * @property {number} maxGenerations max generations
 */

const PLUGIN_NAME = "MemoryWithGcCachePlugin";

class MemoryWithGcCachePlugin {
	/**
	 * Creates an instance of MemoryWithGcCachePlugin.
	 * @param {MemoryWithGcCachePluginOptions} options options
	 */
	constructor({ maxGenerations }) {
		/** @type {number} */
		this._maxGenerations = maxGenerations;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const maxGenerations = this._maxGenerations;
		/** @type {Map<string, { etag: Etag | null, data: Data } | undefined | null>} */
		const cache = new Map();
		/** @type {Map<string, { entry: { etag: Etag | null, data: Data } | null, until: number }>} */
		const oldCache = new Map();
		let generation = 0;
		let cachePosition = 0;
		const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);
		compiler.hooks.afterDone.tap(PLUGIN_NAME, () => {
			generation++;
			let clearedEntries = 0;
			/** @type {undefined | string} */
			let lastClearedIdentifier;
			// Avoid coverage problems due indirect changes
			/* istanbul ignore next */
			for (const [identifier, entry] of oldCache) {
				if (entry.until > generation) break;

				oldCache.delete(identifier);
				if (cache.get(identifier) === undefined) {
					cache.delete(identifier);
					clearedEntries++;
					lastClearedIdentifier = identifier;
				}
			}
			if (clearedEntries > 0 || oldCache.size > 0) {
				logger.log(
					`${cache.size - oldCache.size} active entries, ${
						oldCache.size
					} recently unused cached entries${
						clearedEntries > 0
							? `, ${clearedEntries} old unused cache entries removed e. g. ${lastClearedIdentifier}`
							: ""
					}`
				);
			}
			let i = (cache.size / maxGenerations) | 0;
			let j = cachePosition >= cache.size ? 0 : cachePosition;
			cachePosition = j + i;
			for (const [identifier, entry] of cache) {
				if (j !== 0) {
					j--;
					continue;
				}
				if (entry !== undefined) {
					// We don't delete the cache entry, but set it to undefined instead
					// This reserves the location in the data table and avoids rehashing
					// when constantly adding and removing entries.
					// It will be deleted when removed from oldCache.
					cache.set(identifier, undefined);
					oldCache.delete(identifier);
					oldCache.set(identifier, {
						entry,
						until: generation + maxGenerations
					});
					if (i-- === 0) break;
				}
			}
		});
		compiler.cache.hooks.store.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
			(identifier, etag, data) => {
				cache.set(identifier, { etag, data });
			}
		);
		compiler.cache.hooks.get.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
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
				let known = cacheEntry !== undefined;
				if (cacheEntry !== undefined) {
					if (cacheEntry.etag === etag) return cacheEntry.data;
				} else {
					const oldCacheEntry = oldCache.get(identifier);
					if (oldCacheEntry !== undefined) {
						const entry = oldCacheEntry.entry;
						if (entry === null) {
							oldCache.delete(identifier);
							cache.set(identifier, entry);
							return null;
						}
						known = true;
						if (entry.etag === etag) {
							oldCache.delete(identifier);
							cache.set(identifier, entry);
							return entry.data;
						}
					}
				}
				gotHandlers.push((result, callback) => {
					if (result !== undefined) {
						cache.set(identifier, { etag, data: result });
					} else if (!known) {
						// Record the miss only for an identifier nothing was known about:
						// an entry reached with a different etag still answers its own.
						cache.set(identifier, null);
					}
					return callback();
				});
			}
		);
		compiler.cache.hooks.shutdown.tap(
			{ name: PLUGIN_NAME, stage: Cache.STAGE_MEMORY },
			() => {
				cache.clear();
				oldCache.clear();
			}
		);
	}
}

module.exports = MemoryWithGcCachePlugin;
