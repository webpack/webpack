"use strict";

module.exports = class SortableSet extends Set {

	constructor(initialIterable, defaultSort) {
		super(initialIterable);
		this._sortFn = defaultSort;
	}

	/**
	 * @param {Function} sortFn - function to sort the set
	 * @returns {void}
	 */
	sortWith(sortFn) {
		const sortedArray = Array.from(this).sort(sortFn);
		this.clear();
		for(let i = 0; i < sortedArray.length; i += 1) {
			this.add(sortedArray[i]);
		}
	}

	/**
	 * @returns {void}
	 */
	sort() {
		this.sortWith(this._sortFn);
	}
};
