"use strict";

module.exports = class SortableSet extends Set {

	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
		this._lastActiveSortFn = null;
	}

	/**
	 * @param {any} value - value to add to set
	 * @returns {SortableSet} - returns itself
	 */
	add(value) {
		this._lastActiveSortFn = null;
		super.add(value);
		return this;
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
			this.add(sortedArray[i]);
		}
		this._lastActiveSortFn = sortFn;
	}

	/**
	 * @returns {void}
	 */
	sort() {
		this.sortWith(this._sortFn);
	}
};
