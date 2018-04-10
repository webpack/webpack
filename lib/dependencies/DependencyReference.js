/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/
"use strict";

class DependencyReference {
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
