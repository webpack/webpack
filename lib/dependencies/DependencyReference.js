/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("../Module")} Module */
/** @typedef {() => Module} ModuleCallback */
/** @typedef {string[]} StringArray */

class DependencyReference {
	/**
	 *
	 * @param {StringArray[]} importedNames imported named from the module
	 * @param {number} order the order information or NaN if don't care
	 */
	constructor(importedNames, order = NaN) {
		// true: full object
		// false: only sideeffects/no export
		// array of strings: the exports with this names
		this.importedNames = importedNames;
		this.order = order;
	}

	/**
	 * @template T
	 * @param {T[]} array an array (will be modified)
	 * @param {function(T): DependencyReference} selector selector function
	 * @returns {T[]} the array again
	 */
	static sort(array, selector) {
		/** @type {Map<T, number>} */
		const originalOrder = new Map();
		let i = 0;
		for (const ref of array) {
			originalOrder.set(ref, i++);
		}
		return array.sort((a, b) => {
			const aOrder = selector(a).order;
			const bOrder = selector(b).order;
			if (isNaN(aOrder)) {
				if (!isNaN(bOrder)) {
					return 1;
				}
			} else {
				if (isNaN(bOrder)) {
					return -1;
				}
				if (aOrder !== bOrder) {
					return aOrder - bOrder;
				}
			}
			const aOrg = originalOrder.get(a);
			const bOrg = originalOrder.get(b);
			return aOrg - bOrg;
		});
	}
}

DependencyReference.NO_IMPORTED_NAMES = [];
DependencyReference.NS_OBJECT_IMPORTED = [[]];

module.exports = DependencyReference;
