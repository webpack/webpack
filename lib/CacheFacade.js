/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { forEachBail } = require("enhanced-resolve");
const asyncLib = require("neo-async");
const getLazyHashedEtag = require("./cache/getLazyHashedEtag");
const mergeEtags = require("./cache/mergeEtags");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Cache")} Cache */
/** @typedef {import("./Cache").Etag} Etag */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./cache/getLazyHashedEtag").HashableObject} HashableObject */
/** @typedef {import("./util/Hash").HashFunction} HashFunction */

/** @typedef {"Compilation/modules" | "Compilation/assets" | "Compilation/codeGeneration"} KnownCacheItemType */

/**
 * A cache entry of a known item type, discriminated by `type` so `data` narrows.
 * @typedef {{ type: "Compilation/modules", data: Module } | { type: "Compilation/assets", data: Source } | { type: "Compilation/codeGeneration", data: CodeGenerationResult }} CacheFilterEntry
 */

/**
 * Decides whether a cache entry should be stored. Only called for the known
 * Compilation caches; return false to skip storing the entry.
 * @typedef {(entry: CacheFilterEntry) => boolean} CacheFilter
 */

/**
 * Defines the callback cache callback.
 * @template T
 * @callback CallbackCache
 * @param {(Error | null)=} err
 * @param {(T | null)=} result
 * @returns {void}
 */

/**
 * Defines the callback normal error cache callback.
 * @template T
 * @callback CallbackNormalErrorCache
 * @param {(Error | null)=} err
 * @param {T=} result
 * @returns {void}
 */

class MultiItemCache {
	/**
	 * Creates an instance of MultiItemCache.
	 * @param {ItemCacheFacade[]} items item caches
	 */
	constructor(items) {
		this._items = items;
		// @ts-expect-error expected - returns the single ItemCacheFacade when passed an array of length 1
		// eslint-disable-next-line no-constructor-return
		if (items.length === 1) return /** @type {ItemCacheFacade} */ (items[0]);
	}

	/**
	 * Returns value.
	 * @template T
	 * @param {CallbackCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	get(callback) {
		forEachBail(this._items, (item, callback) => item.get(callback), callback);
	}

	/**
	 * Returns promise with the data.
	 * @template T
	 * @returns {Promise<T>} promise with the data
	 */
	getPromise() {
		/**
		 * Returns promise with the data.
		 * @param {number} i index
		 * @returns {Promise<T>} promise with the data
		 */
		const next = (i) =>
			this._items[i].getPromise().then((result) => {
				if (result !== undefined) return result;
				if (++i < this._items.length) return next(i);
			});
		return next(0);
	}

	/**
	 * Processes the provided data.
	 * @template T
	 * @param {T} data the value to store
	 * @param {CallbackCache<void>} callback signals when the value is stored
	 * @returns {void}
	 */
	store(data, callback) {
		asyncLib.each(
			this._items,
			(item, callback) => item.store(data, callback),
			callback
		);
	}

	/**
	 * Stores the provided data.
	 * @template T
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(data) {
		return Promise.all(this._items.map((item) => item.storePromise(data))).then(
			() => {}
		);
	}
}

class ItemCacheFacade {
	/**
	 * Creates an instance of ItemCacheFacade.
	 * @param {Cache} cache the root cache
	 * @param {string} name the child cache item name
	 * @param {Etag | null} etag the etag
	 */
	constructor(cache, name, etag) {
		this._cache = cache;
		this._name = name;
		this._etag = etag;
	}

	/**
	 * Returns value.
	 * @template T
	 * @param {CallbackCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	get(callback) {
		this._cache.get(this._name, this._etag, callback);
	}

	/**
	 * Returns promise with the data.
	 * @template T
	 * @returns {Promise<T>} promise with the data
	 */
	getPromise() {
		return new Promise((resolve, reject) => {
			this._cache.get(this._name, this._etag, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Processes the provided data.
	 * @template T
	 * @param {T} data the value to store
	 * @param {CallbackCache<void>} callback signals when the value is stored
	 * @returns {void}
	 */
	store(data, callback) {
		this._cache.store(this._name, this._etag, data, callback);
	}

	/**
	 * Stores the provided data.
	 * @template T
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(data) {
		return new Promise((resolve, reject) => {
			this._cache.store(this._name, this._etag, data, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Processes the provided computer.
	 * @template T
	 * @param {(callback: CallbackNormalErrorCache<T>) => void} computer function to compute the value if not cached
	 * @param {CallbackNormalErrorCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	provide(computer, callback) {
		this.get((err, cacheEntry) => {
			if (err) return callback(err);
			if (cacheEntry !== undefined) return cacheEntry;
			computer((err, result) => {
				if (err) return callback(err);
				this.store(result, (err) => {
					if (err) return callback(err);
					callback(null, result);
				});
			});
		});
	}

	/**
	 * Returns promise with the data.
	 * @template T
	 * @param {() => Promise<T> | T} computer function to compute the value if not cached
	 * @returns {Promise<T>} promise with the data
	 */
	async providePromise(computer) {
		const cacheEntry = await this.getPromise();
		if (cacheEntry !== undefined) return cacheEntry;
		const result = await computer();
		await this.storePromise(result);
		return result;
	}
}

class CacheFacade {
	/**
	 * Creates an instance of CacheFacade.
	 * @param {Cache} cache the root cache
	 * @param {string} name the child cache name
	 * @param {HashFunction=} hashFunction the hash function to use
	 */
	constructor(cache, name, hashFunction) {
		this._cache = cache;
		this._name = name;
		this._hashFunction = hashFunction;
	}

	/**
	 * Returns child cache.
	 * @param {string} name the child cache name#
	 * @returns {CacheFacade} child cache
	 */
	getChildCache(name) {
		return new CacheFacade(
			this._cache,
			`${this._name}|${name}`,
			this._hashFunction
		);
	}

	/**
	 * Returns item cache.
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @returns {ItemCacheFacade} item cache
	 */
	getItemCache(identifier, etag) {
		return new ItemCacheFacade(
			this._cache,
			`${this._name}|${identifier}`,
			etag
		);
	}

	/**
	 * Gets lazy hashed etag.
	 * @param {HashableObject} obj an hashable object
	 * @returns {Etag} an etag that is lazy hashed
	 */
	getLazyHashedEtag(obj) {
		return getLazyHashedEtag(obj, this._hashFunction);
	}

	/**
	 * Merges the provided values into a single result.
	 * @param {Etag} a an etag
	 * @param {Etag} b another etag
	 * @returns {Etag} an etag that represents both
	 */
	mergeEtags(a, b) {
		return mergeEtags(a, b);
	}

	/**
	 * Returns value.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {CallbackCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	get(identifier, etag, callback) {
		this._cache.get(`${this._name}|${identifier}`, etag, callback);
	}

	/**
	 * Returns promise with the data.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @returns {Promise<T>} promise with the data
	 */
	getPromise(identifier, etag) {
		return new Promise((resolve, reject) => {
			this._cache.get(`${this._name}|${identifier}`, etag, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Processes the provided identifier.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {T} data the value to store
	 * @param {CallbackCache<void>} callback signals when the value is stored
	 * @returns {void}
	 */
	store(identifier, etag, data, callback) {
		this._cache.store(`${this._name}|${identifier}`, etag, data, callback);
	}

	/**
	 * Stores the provided identifier.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(identifier, etag, data) {
		return new Promise((resolve, reject) => {
			this._cache.store(`${this._name}|${identifier}`, etag, data, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Processes the provided identifier.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {(callback: CallbackNormalErrorCache<T>) => void} computer function to compute the value if not cached
	 * @param {CallbackNormalErrorCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	provide(identifier, etag, computer, callback) {
		this.get(identifier, etag, (err, cacheEntry) => {
			if (err) return callback(err);
			if (cacheEntry !== undefined) return cacheEntry;
			computer((err, result) => {
				if (err) return callback(err);
				this.store(identifier, etag, result, (err) => {
					if (err) return callback(err);
					callback(null, result);
				});
			});
		});
	}

	/**
	 * Returns promise with the data.
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {() => Promise<T> | T} computer function to compute the value if not cached
	 * @returns {Promise<T>} promise with the data
	 */
	async providePromise(identifier, etag, computer) {
		const cacheEntry = await this.getPromise(identifier, etag);
		if (cacheEntry !== undefined) return cacheEntry;
		const result = await computer();
		await this.storePromise(identifier, etag, result);
		return result;
	}
}

/**
 * Well-known cache item types (the cache name passed to `compiler.getCache`).
 * @type {Record<string, KnownCacheItemType>}
 */
const CACHE_TYPES = {
	MODULES: "Compilation/modules",
	ASSETS: "Compilation/assets",
	CODE_GENERATION: "Compilation/codeGeneration"
};

/** @type {Set<string>} */
const KNOWN_CACHE_TYPES = new Set([
	CACHE_TYPES.MODULES,
	CACHE_TYPES.ASSETS,
	CACHE_TYPES.CODE_GENERATION
]);

/**
 * @param {string} identifier cache entry identifier
 * @returns {string} cache item type
 */
const getItemType = (identifier) => {
	let start = 0;
	for (;;) {
		const sep = identifier.indexOf("|", start);
		if (sep === -1) return identifier.slice(start);
		const next = identifier.indexOf("|", sep + 1);
		if (next === -1) return identifier.slice(start, sep);
		// Skip a `<name>|<index>|` pair only when the second segment is all digits.
		let isIndex = next > sep + 1;
		for (let i = sep + 1; i < next; i++) {
			const c = identifier.charCodeAt(i);
			if (c < 48 || c > 57) {
				isIndex = false;
				break;
			}
		}
		if (!isIndex) return identifier.slice(start, sep);
		start = next + 1;
	}
};

/**
 * @param {string} identifier cache entry identifier
 * @returns {KnownCacheItemType | undefined} known item type, if any
 */
const getKnownCacheType = (identifier) => {
	const type = getItemType(identifier);
	return KNOWN_CACHE_TYPES.has(type)
		? /** @type {KnownCacheItemType} */ (type)
		: undefined;
};

module.exports = CacheFacade;
module.exports.CACHE_TYPES = CACHE_TYPES;
module.exports.ItemCacheFacade = ItemCacheFacade;
module.exports.MultiItemCache = MultiItemCache;
module.exports.getKnownCacheType = getKnownCacheType;
