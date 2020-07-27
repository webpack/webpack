/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const getLazyHashedEtag = require("./cache/getLazyHashedEtag");

/** @typedef {import("./Cache")} Cache */
/** @typedef {import("./Cache").Etag} Etag */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./cache/getLazyHashedEtag").HashableObject} HashableObject */

class MultiItemCache {
	/**
	 * @param {ItemCacheFacade[]} items item caches
	 */
	constructor(items) {
		this._items = items;
	}

	/**
	 * @template T
	 * @param {CallbackCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	get(callback) {
		const next = i => {
			this._items[i].get((err, result) => {
				if (err) return callback(err);
				if (result !== undefined) return callback(null, result);
				if (++i >= this._items.length) return callback();
				next(i);
			});
		};
		next(0);
	}

	/**
	 * @template T
	 * @returns {Promise<T>} promise with the data
	 */
	getPromise() {
		const next = i => {
			return this._items[i].getPromise().then(result => {
				if (result !== undefined) return result;
				if (++i < this._items.length) return next(i);
			});
		};
		return next(0);
	}

	/**
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
	 * @template T
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(data) {
		return Promise.all(
			this._items.map(item => item.storePromise(data))
		).then(() => {});
	}
}

/**
 * @template T
 * @callback CallbackCache
 * @param {WebpackError=} err
 * @param {T=} result
 * @returns {void}
 */

class ItemCacheFacade {
	/**
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
	 * @template T
	 * @param {CallbackCache<T>} callback signals when the value is retrieved
	 * @returns {void}
	 */
	get(callback) {
		this._cache.get(this._name, this._etag, callback);
	}

	/**
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
	 * @template T
	 * @param {T} data the value to store
	 * @param {CallbackCache<void>} callback signals when the value is stored
	 * @returns {void}
	 */
	store(data, callback) {
		this._cache.store(this._name, this._etag, data, callback);
	}

	/**
	 * @template T
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(data) {
		return new Promise((resolve, reject) => {
			this._cache.store(this._name, this._etag, data, err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}

class CacheFacade {
	/**
	 * @param {Cache} cache the root cache
	 * @param {string} name the child cache name
	 */
	constructor(cache, name) {
		this._cache = cache;
		this._name = name;
	}

	/**
	 * @param {string} name the child cache name#
	 * @returns {CacheFacade} child cache
	 */
	getChildCache(name) {
		return new CacheFacade(this._cache, `${this._name}|${name}`);
	}

	/**
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
	 * @param {HashableObject} obj an hashable object
	 * @returns {Etag} an etag that is lazy hashed
	 */
	getLazyHashedEtag(obj) {
		return getLazyHashedEtag(obj);
	}

	/**
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
	 * @template T
	 * @param {string} identifier the cache identifier
	 * @param {Etag | null} etag the etag
	 * @param {T} data the value to store
	 * @returns {Promise<void>} promise signals when the value is stored
	 */
	storePromise(identifier, etag, data) {
		return new Promise((resolve, reject) => {
			this._cache.store(`${this._name}|${identifier}`, etag, data, err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}

module.exports = CacheFacade;
module.exports.ItemCacheFacade = ItemCacheFacade;
module.exports.MultiItemCache = MultiItemCache;
