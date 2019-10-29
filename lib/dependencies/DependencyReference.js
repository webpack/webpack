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
	 * @param {StringArray[]} importedNames imported named from the module
	 */
	constructor(importedNames) {
		// true: full object
		// false: only sideeffects/no export
		// array of strings: the exports with this names
		this.importedNames = importedNames;
	}
}

DependencyReference.NO_IMPORTED_NAMES = [];
DependencyReference.NS_OBJECT_IMPORTED = [[]];

module.exports = DependencyReference;
