// @ts-nocheck
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Cache").Data} Data */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {{ log: (...args: EXPECTED_ANY[]) => void }} Logger */

class MemoryStore {
	/**
	 * @param {object=} options options
	 * @param {number=} options.maxGenerations max generations
	 * @param {Logger=} options.logger logger
	 */
	constructor({ maxGenerations = Infinity, logger } = {}) {
		/** @type {number} */
		this.maxGenerations = maxGenerations;
		/** @type {Logger | undefined} */
		this.logger = logger;
		/** @type {Map<string, { etag: Etag | null, data: Data } | undefined | null>} */
		this.cache = new Map();
		/** @type {Map<string, { entry: { etag: Etag | null, data: Data } | null, until: number }>} */
		this.oldCache = new Map();
		/** @type {number} */
		this.generation = 0;
		/** @type {number} */
		this.cachePosition = 0;
	}

	/**
	 * @param {string} identifier identifier
	 * @param {Etag | null} etag etag
	 * @param {Data} data data
	 * @returns {void}
	 */
	store(identifier, etag, data) {
		this.cache.set(identifier, { etag, data });
	}

	/**
	 * @param {string} identifier identifier
	 * @param {Etag | null} etag etag
	 * @returns {Data} data
	 */
	restore(identifier, etag) {
		const cacheEntry = this.cache.get(identifier);
		if (cacheEntry === null) return null;
		if (cacheEntry !== undefined) {
			return cacheEntry.etag === etag ? cacheEntry.data : null;
		}
		const oldCacheEntry = this.oldCache.get(identifier);
		if (oldCacheEntry !== undefined) {
			const entry = oldCacheEntry.entry;
			this.oldCache.delete(identifier);
			this.cache.set(identifier, entry);
			if (entry === null) return null;
			return entry.etag === etag ? entry.data : null;
		}
	}

	/**
	 * @param {string} identifier identifier
	 * @param {Etag | null} etag etag
	 * @param {Data} data data
	 * @returns {void}
	 */
	rememberResult(identifier, etag, data) {
		this.cache.set(identifier, data === undefined ? null : { etag, data });
	}

	/**
	 * Runs one generation of GC.
	 * @returns {void}
	 */
	afterDone() {
		if (!Number.isFinite(this.maxGenerations)) return;
		const maxGenerations = this.maxGenerations;
		this.generation++;
		let clearedEntries = 0;
		/** @type {undefined | string} */
		let lastClearedIdentifier;
		for (const [identifier, entry] of this.oldCache) {
			if (entry.until > this.generation) break;
			this.oldCache.delete(identifier);
			if (this.cache.get(identifier) === undefined) {
				this.cache.delete(identifier);
				clearedEntries++;
				lastClearedIdentifier = identifier;
			}
		}
		if (this.logger && (clearedEntries > 0 || this.oldCache.size > 0)) {
			this.logger.log(
				`${this.cache.size - this.oldCache.size} active entries, ${
					this.oldCache.size
				} recently unused cached entries${
					clearedEntries > 0
						? `, ${clearedEntries} old unused cache entries removed e. g. ${lastClearedIdentifier}`
						: ""
				}`
			);
		}
		let i = (this.cache.size / maxGenerations) | 0;
		let j = this.cachePosition >= this.cache.size ? 0 : this.cachePosition;
		this.cachePosition = j + i;
		for (const [identifier, entry] of this.cache) {
			if (j !== 0) {
				j--;
				continue;
			}
			if (entry !== undefined) {
				this.cache.set(identifier, undefined);
				this.oldCache.delete(identifier);
				this.oldCache.set(identifier, {
					entry,
					until: this.generation + maxGenerations
				});
				if (i-- === 0) break;
			}
		}
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.cache.clear();
		this.oldCache.clear();
	}
}

module.exports = MemoryStore;
