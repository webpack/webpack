"use strict";

module.exports = class SortableSet extends Set {

	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
		this._lastActiveSortFn = null;
		this._isSorted = false;
	}

	/**
	 * @param {any} value - value to add to set
	 * @returns {SortableSet} - returns itself
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._isSorted = false;
		super.add(value);
		return this;
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this._lastActiveSortFn = null;
		this._isSorted = false;
		super.clear();
	}

	/**
	 * @param {Function} sortFn - function to sort the set
	 * @returns {void}
	 */
	sortWith(sortFn) {
		if(this._isSorted && sortFn === this._lastActiveSortFn) {
			// already sorted - nothing to do
			return;
		}

		const sortedArray = Array.from(this).sort(sortFn);
		super.clear();
		for(let i = 0; i < sortedArray.length; i += 1) {
			this.add(sortedArray[i]);
		}
		this._lastActiveSortFn = sortFn;
		this._isSorted = true;
	}

	/**
	 * @returns {void}
	 */
	sort() {
		this.sortWith(this._sortFn);
	}
};
