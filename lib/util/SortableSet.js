"use strict";
<<<<<<< HEAD

/**
 * A subset of Set that offers sorting functionality
 * @template T
 *
 * @typedef {(a: T, b: T) => number} SortFunction
 */
=======
//TODO: Make this a generic type
//https://github.com/Microsoft/TypeScript/issues/23385
//https://github.com/Microsoft/TypeScript/issues/23384
>>>>>>> 02a955b4335cb7eeeb4dd1c96ef5407c6bcea158
class SortableSet extends Set {
	/**
	 * Create a new sortable set
	 * @param {IterableIterator<T>=} initialIterable The initial iterable value
	 * @param {SortFunction=} defaultSort Default sorting function
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
<<<<<<< HEAD
	 * @param {T} value value to add to set
	 * @returns {this} returns itself
=======
	 * @param {TODO} value - value to add to set
	 * @returns {this} - returns itself
>>>>>>> 02a955b4335cb7eeeb4dd1c96ef5407c6bcea158
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._invalidateCache();
		this._invalidateOrderedCache();
		super.add(value);
		return this;
	}

	/**
	 * @param {T} value value to delete
	 * @returns {boolean} true if value existed in set, false otherwise
	 */
	delete(value) {
		this._invalidateCache();
		this._invalidateOrderedCache();
		return super.delete(value);
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this._invalidateCache();
		this._invalidateOrderedCache();
		return super.clear();
	}

<<<<<<< HEAD
	/**
	 * Sort with a comparer function
	 * @param {SortFunction} sortFn Sorting comparer function
	 * @returns {void}
	 */
	sortWith(sortFn) {
		if (this.size === 0 || sortFn === this._lastActiveSortFn) {
=======
	sortWith(/** @type {(a: TODO, b: TODO) => number} */ sortFn) {
		if (this.size <= 1 || sortFn === this._lastActiveSortFn) {
>>>>>>> 02a955b4335cb7eeeb4dd1c96ef5407c6bcea158
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
<<<<<<< HEAD
	 * @param {(instance: this) => any} fn function to calculate value
	 * @returns {any} returns result of fn(this), cached until set changes
=======
	 * @param {Function} fn - function to calculate value
	 * @returns {TODO} - returns result of fn(this), cached until set changes
>>>>>>> 02a955b4335cb7eeeb4dd1c96ef5407c6bcea158
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
<<<<<<< HEAD
	 * @param {Function} fn function to calculate value
	 * @returns {any} returns result of fn(this), cached until set changes
=======
	 * @param {Function} fn - function to calculate value
	 * @returns {TODO} - returns result of fn(this), cached until set changes
>>>>>>> 02a955b4335cb7eeeb4dd1c96ef5407c6bcea158
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

	/**
	 * @private
	 * @returns {void}
	 */
	_invalidateCache() {
		if (this._cache !== undefined) {
			this._cache.clear();
		}
	}

	/**
	 * @private
	 * @returns {void}
	 */
	_invalidateOrderedCache() {
		if (this._cacheOrderIndependent !== undefined) {
			this._cacheOrderIndependent.clear();
		}
	}
}

module.exports = SortableSet;
