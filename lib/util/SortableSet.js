/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NONE = Symbol("not sorted");
const MULTIPLE = Symbol("more than one cache key");

/**
 * Moves the one pair held inline into a map, so a set asked by a second function
 * keeps every answer.
 * @template C
 * @param {CacheFunction<C>} fn the function cached so far
 * @param {C} data what it answered
 * @returns {Map<CacheFunction<C>, C>} the map to cache in from now on
 */
const promote = (fn, data) => {
	/** @type {Map<CacheFunction<C>, C>} */
	const map = new Map();
	map.set(fn, data);
	return map;
};

/**
 * A subset of Set that offers sorting functionality
 * @template T item type in set
 * @template [C=never] every value the set's cache functions answer; a set caching nothing leaves it out, and one that caches names what it caches
 * @extends {Set<T>}
 */
class SortableSet extends Set {
	// WHY: a typedef outside the class makes `require` give a second
	// `SortableSet` type, which tsc can then not relate to the class's own.
	/**
	 * A function whose answer the cache keeps: only compared, never called.
	 * @template C
	 * @typedef {(set: never) => C} CacheFunction
	 */

	/**
	 * Create a new sortable set
	 * @template T
	 * @typedef {(a: T, b: T) => number} SortFunction
	 * @param {Iterable<T>=} initialIterable The initial iterable value
	 * @param {SortFunction<T>=} defaultSort Default sorting function
	 */
	constructor(initialIterable, defaultSort) {
		// WHY: `Set` adds an iterable through `this.add`, which ran before the
		// fields below existed: the set took a hidden class of its own, and every
		// item paid for clearing caches it did not have yet.
		super();
		/**
		 * @private
		 * @type {undefined | SortFunction<T>}
		 */
		this._sortFn = defaultSort;
		/**
		 * @private
		 * @type {typeof NONE | undefined | ((a: T, b: T) => number)}}
		 */
		this._lastActiveSortFn = NONE;
		// One function asking a set is the common case, so its answer sits in two
		// slots -- 16 bytes against the 184 a Map costs even empty or cleared.
		// `MULTIPLE` in a function slot means its value slot holds a Map.
		/**
		 * @private
		 * @type {undefined | typeof MULTIPLE | CacheFunction<C>}
		 */
		this._cacheFn = undefined;
		/**
		 * @private
		 * @type {undefined | C | Map<CacheFunction<C>, C>}
		 */
		this._cacheValue = undefined;
		/**
		 * @private
		 * @type {undefined | typeof MULTIPLE | CacheFunction<C>}
		 */
		this._cacheOrderIndependentFn = undefined;
		/**
		 * @private
		 * @type {undefined | C | Map<CacheFunction<C>, C>}
		 */
		this._cacheOrderIndependentValue = undefined;
		// Through `this.add`, as `Set` adds them, so a subclass's `add` still sees
		// every item.
		if (Array.isArray(initialIterable)) {
			// An index walks an array without the iterator `for...of` makes.
			for (let i = 0; i < initialIterable.length; i++) {
				this.add(initialIterable[i]);
			}
		} else if (initialIterable !== undefined && initialIterable !== null) {
			for (const item of initialIterable) this.add(item);
		}
	}

	/**
	 * Returns itself.
	 * @param {T} value value to add to set
	 * @returns {this} returns itself
	 */
	add(value) {
		// Unsorted and caching nothing, an add has nothing to invalidate.
		if (
			this._lastActiveSortFn === NONE &&
			this._cacheFn === undefined &&
			this._cacheOrderIndependentFn === undefined
		) {
			super.add(value);
			return this;
		}
		const { size } = this;
		super.add(value);
		// An item already held changes neither the order nor what is cached.
		if (this.size !== size) {
			this._lastActiveSortFn = NONE;
			this._invalidateCache();
			this._invalidateOrderedCache();
		}
		return this;
	}

	/**
	 * Returns true if value existed in set, false otherwise.
	 * @param {T} value value to delete
	 * @returns {boolean} true if value existed in set, false otherwise
	 */
	delete(value) {
		// Caching nothing, a delete has nothing to invalidate.
		if (
			this._cacheFn === undefined &&
			this._cacheOrderIndependentFn === undefined
		) {
			return super.delete(value);
		}
		if (!super.delete(value)) return false;
		this._invalidateCache();
		this._invalidateOrderedCache();
		return true;
	}

	/**
	 * Describes how this clear operation behaves.
	 * @returns {void}
	 */
	clear() {
		if (this.size === 0) return;
		this._invalidateCache();
		this._invalidateOrderedCache();
		super.clear();
	}

	/**
	 * Sort with a comparer function
	 * @param {SortFunction<T> | undefined} sortFn Sorting comparer function
	 * @returns {void}
	 */
	sortWith(sortFn) {
		if (this.size <= 1 || sortFn === this._lastActiveSortFn) {
			// already sorted - nothing to do
			return;
		}

		/** @type {T[]} */
		const sortedArray = [...this].sort(sortFn);
		super.clear();
		for (let i = 0; i < sortedArray.length; i += 1) {
			super.add(sortedArray[i]);
		}
		this._lastActiveSortFn = sortFn;
		this._invalidateCache();
	}

	sort() {
		this.sortWith(this._sortFn);
		return this;
	}

	/**
	 * Get data from cache
	 * @template {C} R
	 * @param {(set: SortableSet<T, C>) => R} fn function to calculate value
	 * @returns {R} returns result of fn(this), cached until set changes
	 */
	getFromCache(fn) {
		const cachedFn = this._cacheFn;
		if (cachedFn === fn) {
			const data = /** @type {R} */ (this._cacheValue);
			if (data !== undefined) {
				return data;
			}
		} else if (cachedFn === MULTIPLE) {
			return this._getFromMap(
				/** @type {Map<(set: SortableSet<T, C>) => R, R>} */
				(this._cacheValue),
				fn
			);
		} else if (cachedFn !== undefined) {
			// Each function's answer has that function's return type, so the map answers `fn` with `R`.
			const map = /** @type {Map<(set: SortableSet<T, C>) => R, R>} */ (
				promote(cachedFn, /** @type {C} */ (this._cacheValue))
			);
			this._cacheFn = MULTIPLE;
			this._cacheValue = map;
			return this._getFromMap(map, fn);
		}
		const newData = fn(this);
		this._cacheFn = fn;
		this._cacheValue = newData;
		return newData;
	}

	/**
	 * Get data from cache (ignoring sorting)
	 * @template {C} R
	 * @param {(set: SortableSet<T, C>) => R} fn function to calculate value
	 * @returns {R} returns result of fn(this), cached until set changes
	 */
	getFromUnorderedCache(fn) {
		const cachedFn = this._cacheOrderIndependentFn;
		if (cachedFn === fn) {
			const data = /** @type {R} */ (this._cacheOrderIndependentValue);
			if (data !== undefined) {
				return data;
			}
		} else if (cachedFn === MULTIPLE) {
			return this._getFromMap(
				/** @type {Map<(set: SortableSet<T, C>) => R, R>} */
				(this._cacheOrderIndependentValue),
				fn
			);
		} else if (cachedFn !== undefined) {
			// Each function's answer has that function's return type, so the map answers `fn` with `R`.
			const map = /** @type {Map<(set: SortableSet<T, C>) => R, R>} */ (
				promote(cachedFn, /** @type {C} */ (this._cacheOrderIndependentValue))
			);
			this._cacheOrderIndependentFn = MULTIPLE;
			this._cacheOrderIndependentValue = map;
			return this._getFromMap(map, fn);
		}
		const newData = fn(this);
		this._cacheOrderIndependentFn = fn;
		this._cacheOrderIndependentValue = newData;
		return newData;
	}

	/**
	 * @private
	 * @template {C} R
	 * @param {Map<(set: SortableSet<T, C>) => R, R>} map cache of a set asked by several functions
	 * @param {(set: SortableSet<T, C>) => R} fn function to calculate value
	 * @returns {R} returns result of fn(this), cached until set changes
	 */
	_getFromMap(map, fn) {
		const data = map.get(fn);
		if (data !== undefined) {
			return data;
		}
		const newData = fn(this);
		map.set(fn, newData);
		return newData;
	}

	/**
	 * Invalidates the cached state associated with this value.
	 * @private
	 * @returns {void}
	 */
	_invalidateCache() {
		if (this._cacheFn !== undefined) {
			this._cacheFn = undefined;
			this._cacheValue = undefined;
		}
	}

	/**
	 * Invalidate ordered cache.
	 * @private
	 * @returns {void}
	 */
	_invalidateOrderedCache() {
		if (this._cacheOrderIndependentFn !== undefined) {
			this._cacheOrderIndependentFn = undefined;
			this._cacheOrderIndependentValue = undefined;
		}
	}

	/**
	 * Returns the raw array.
	 * @returns {T[]} the raw array
	 */
	toJSON() {
		return [...this];
	}
}

module.exports = SortableSet;
