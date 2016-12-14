/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const compareLocations = require("./compareLocations");

class Dependency {
	constructor() {
		this.module = null;
	}

	isEqualResource() {
		return false;
	}

	// Returns the referenced module and export
	getReference() {
		if(!this.module) return null;
		return {
			module: this.module,
			importedNames: true, // true: full object, false: only sideeffects/no export, array of strings: the exports with this names
		};
	}

	// Returns the exported names
	getExports() {
		return null;
	}

	getWarnings() {
		return null;
	}

	getErrors() {
		return null;
	}

	updateHash(hash) {
		hash.update((this.module && this.module.id) + "");
	}

	disconnect() {
		this.module = null;
	}

	compare(a, b) {
		return compareLocations(a.loc, b.loc);
	}
}
Dependency.compare = (a, b) => compareLocations(a.loc, b.loc);

module.exports = Dependency;
