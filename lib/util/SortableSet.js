"use strict";

module.exports = class SortableSet extends Set {

	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
		this._lastActiveSortFn = null;
		this._cache = null;
		this._cacheOrderIndependent = null;
	}

	/**
	 * @param {any} value - value to add to set
	 * @returns {SortableSet} - returns itself
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._cache = null;
		this._cacheOrderIndependent = null;
		super.add(value);
		return this;
	}

	delete(value) {
		this._cache = null;
		this._cacheOrderIndependent = null;
		return super.delete(value);
	}

	clear() {
		this._cache = null;
		this._cacheOrderIndependent = null;
		return super.clear();
	}

	/**
	 * @param {Function} sortFn - function to sort the set
	 * @returns {void}
	 */
	sortWith(sortFn) {
		if(this.size === 0 || sortFn === this._lastActiveSortFn) {
			// already sorted - nothing to do
			return;
		}

		const sortedArray = Array.from(this).sort(sortFn);
		super.clear();
		for(let i = 0; i < sortedArray.length; i += 1) {
			super.add(sortedArray[i]);
		}
		this._lastActiveSortFn = sortFn;
		this._cache = null;
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
	getCachedInfo(fn) {
		if(this._cache === null) {
			this._cache = new Map();
		} else {
			const data = this._cache.get(fn);
			if(data !== undefined) {
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
	getOrderIndependentCachedInfo(fn) {
		if(this._cacheOrderIndependent === null) {
			this._cacheOrderIndependent = new Map();
		} else {
			const data = this._cacheOrderIndependent.get(fn);
			if(data !== undefined) {
				return data;
			}
		}
		const newData = fn(this);
		this._cacheOrderIndependent.set(fn, newData);
		return newData;
	}
};
