/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/
"use strict";

/** @typedef {import("../Module")} Module */
/** @typedef {() => Module} ModuleCallback */

class DependencyReference {
	// TODO webpack 5: module must be dynamic, you must pass a function returning a module
	// This is needed to remove the hack in ConcatenatedModule
	// The problem is that the `module` in Dependency could be replaced i. e. because of Scope Hoisting
	/**
	 *
	 * @param {ModuleCallback} moduleCallback a callback to get the referenced module
	 * @param {string[] | boolean} importedNames imported named from the module
	 * @param {boolean=} weak if this is a weak reference
	 * @param {number} order the order information or NaN if don't care
	 */
	constructor(moduleCallback, importedNames, weak = false, order = NaN) {
		this.moduleCallback = moduleCallback;
		// true: full object
		// false: only sideeffects/no export
		// array of strings: the exports with this names
		this.importedNames = importedNames;
		this.weak = !!weak;
		this.order = order;
	}

	/**
	 * @param {DependencyReference[]} array an array (will be modified)
	 * @returns {DependencyReference[]} the array again
	 */
	static sort(array) {
		/** @type {WeakMap<DependencyReference, number>} */
		const originalOrder = new WeakMap();
		let i = 0;
		for (const ref of array) {
			originalOrder.set(ref, i++);
		}
		return array.sort((a, b) => {
			const aOrder = a.order;
			const bOrder = b.order;
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

	get module() {
		return this.moduleCallback();
	}
}

module.exports = DependencyReference;
