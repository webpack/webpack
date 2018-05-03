/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/
"use strict";

/** @typedef {import('../Module')} Module */

class DependencyReference {
	/**
	 * Creates an instance of DependencyReference.
	 * @param {Module} module module there reference comes from
	 * @param {string[]|boolean} importedNames imported names or boolean
	 * @param {boolean} weak is weak reference or not
	 * @memberof DependencyReference
	 */
	constructor(module, importedNames, weak) {
		this.module = module;
		// true: full object
		// false: only sideeffects/no export
		// array of strings: the exports with this names
		this.importedNames = importedNames;
		this.weak = weak;
	}
}

module.exports = DependencyReference;
