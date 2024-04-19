/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author @mknichel
*/

"use strict";

/**
 * A class used to represent a key in a {@link WeakMap}. {@link Symbol} can not
 * be used due to https://github.com/nodejs/node/issues/49135.
 */
class WeakMapKey {
	/**
	 * @param {string} key The key to use for caching.
	 */
	constructor(key) {
		this.key = key;
	}
}

/**
 * A cache for storing information that could be shared by modules across
 * different layers. This can be useful for memory management since the same
 * file that appears in multiple layers may duplicate large strings, such as
 * the contents of the source file. The values in this cache can be garbage
 * collected if there are no more retaining references.
 */
class ModuleLayerCache {
	constructor() {
		/** @type {Map<string, WeakMapKey>} */
		this.weakMapKeys = new Map();
		/** @type {WeakMap<WeakMapKey, string | Buffer>} */
		this.cachedValues = new WeakMap();
	}

	/**
	 * Checks to see if there is an entry for the key in this cache. The key is
	 * typically {@link NormalModule#request}.
	 *
	 * @param {string} key The key to use for caching.
	 * @returns {boolean} Whether there is an entry for the key in this cache.
	 */
	has(key) {
		return (
			this.weakMapKeys.has(key) &&
			this.cachedValues.has(this.weakMapKeys.get(key))
		);
	}

	/**
	 * Returns the cached value value for the key in this cache if the value has
	 * not already been garbage collected.
	 *
	 * @param {string} key The key to use for caching.
	 * @returns {string | Buffer} The cached value for this key.
	 */
	get(key) {
		if (!this.has(key)) {
			return null;
		}
		const weakMapKey = this.weakMapKeys.get(key);
		return this.cachedValues.get(weakMapKey);
	}

	/**
	 * Stores the value in this cache as a weakly held value (i.e. it can be
	 * garbage collected).
	 *
	 * @param {string} key The key to use for caching.
	 * @param {string | Buffer} value The value to store in the cache.
	 */
	set(key, value) {
		const weakMapKey = this.weakMapKeys.has(key)
			? this.weakMapKeys.get(key)
			: new WeakMapKey(key);
		this.weakMapKeys.set(key, weakMapKey);
		this.cachedValues.set(weakMapKey, value);
	}
}

module.exports = ModuleLayerCache;
