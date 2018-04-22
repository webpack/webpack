"use strict";

/**
 * A subset of Set that offers sorting functionality
 * @template T
 */
class SortableSet extends Set {
	/**
	 * Create a new sortable set
	 * @param {IterableIterator<T>=} initialIterable
	 * @param {(a: T, b: T) => number=} defaultSort
	 */
	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		/** @private @type {(a: T, b: T) => number}} */
		this._sortFn = defaultSort;
		/** @private @type {(a: T, b: T) => number} | null} */
		this._lastActiveSortFn = null;
		/** @private @type {Map<Function, T> | undefined} */
		this._cache = undefined;
		/** @private @type {Map<Function, T> | undefined} */
		this._cacheOrderIndependent = undefined;
	}

	/**
	 * @param {T} value - value to add to set
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._invalidateCache();
		this._invalidateOrderedCache();
		super.add(value);
		return this;
	}

	/**
	 * @param {T} value
	 */
	delete(value) {
		this._invalidateCache();
		this._invalidateOrderedCache();
		return super.delete(value);
	}

	clear() {
		this._invalidateCache();
		this._invalidateOrderedCache();
		return super.clear();
	}

	/**
	 * Sort with a comparer function
	 * @param {(a: T, b: T) => number} sortFn
	 */
	sortWith(sortFn) {
		if (this.size === 0 || sortFn === this._lastActiveSortFn) {
			// already sorted - nothing to do
			return;
		}

		const sortedArray = Array.from(this).sort(sortFn);
		super.clear();
		for (let i = 0; i < sortedArray.length; i += 1) {
			super.add(sortedArray[i]);
		}
		this._lastActiveSortFn = sortFn;
		this._invalidateCache();
	}

	sort() {
		this.sortWith(this._sortFn);
	}

	/**
	 * @param {Function} fn - function to calculate value
	 * @returns {any} - returns result of fn(this), cached until set changes
	 */
	getFromCache(fn) {
		if (this._cache === undefined) {
			this._cache = new Map();
		} else {
			const data = this._cache.get(fn);
			if (data !== undefined) {
				return data;
			}
		}
		const newData = fn(this);
		this._cache.set(fn, newData);
		return newData;
	}

	/**
	 * @param {Function} fn - function to calculate value
	 * @returns {any} - returns result of fn(this), cached until set changes
	 */
	getFromUnorderedCache(fn) {
		if (this._cacheOrderIndependent === undefined) {
			this._cacheOrderIndependent = new Map();
		} else {
			const data = this._cacheOrderIndependent.get(fn);
			if (data !== undefined) {
				return data;
			}
		}
		const newData = fn(this);
		this._cacheOrderIndependent.set(fn, newData);
		return newData;
	}

	/** @private */
	_invalidateCache() {
		if (this._cache !== undefined) this._cache.clear();
	}

	/** @private */
	_invalidateOrderedCache() {
		if (this._cacheOrderIndependent !== undefined)
			this._cacheOrderIndependent.clear();
	}
}

module.exports = SortableSet;
