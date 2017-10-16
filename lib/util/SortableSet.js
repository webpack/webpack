"use strict";

module.exports = class SortableSet extends Set {

	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
		this._lastActiveSortFn = null;
		this._frozenArray = null;
	}

	/**
	 * @param {any} value - value to add to set
	 * @returns {SortableSet} - returns itself
	 */
	add(value) {
		this._lastActiveSortFn = null;
		this._frozenArray = null;
		super.add(value);
		return this;
	}

	delete(value) {
		this._frozenArray = null;
		return super.delete(value);
	}

	clear() {
		this._frozenArray = null;
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
		this._frozenArray = null;
	}

	/**
	 * @returns {void}
	 */
	sort() {
		this.sortWith(this._sortFn);
	}

	/**
	 * @returns {any[]} - returns content as frozen array
	 */
	getFrozenArray() {
		if(this._frozenArray === null) {
			this._frozenArray = Object.freeze(Array.from(this));
		}
		return this._frozenArray;
	}
};
