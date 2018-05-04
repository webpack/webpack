"use strict";
//TODO: Make this a generic type
//https://github.com/Microsoft/TypeScript/issues/23385
//https://github.com/Microsoft/TypeScript/issues/23384
class SortableSet extends Set {
	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
		this._lastActiveSortFn = null;
		this._cache = undefined;
		this._cacheOrderIndependent = undefined;
	}

	/**
	 * @param {any} value - value to add to set
	 * @returns {this} - returns itself
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._invalidateCache();
		this._invalidateOrderedCache();
		super.add(value);
		return this;
	}

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

	sortWith(/** @type {(a: any, b: any) => number} */ sortFn) {
		if (this.size <= 1 || sortFn === this._lastActiveSortFn) {
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

	/**
	 * @returns {void}
	 */
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

	_invalidateCache() {
		if (this._cache !== undefined) this._cache.clear();
	}

	_invalidateOrderedCache() {
		if (this._cacheOrderIndependent !== undefined)
			this._cacheOrderIndependent.clear();
	}
}

module.exports = SortableSet;
