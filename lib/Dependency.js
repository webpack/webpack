/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const compareLocations = require("./compareLocations");

class Dependency {
	constructor() {
		this.module = null;
		this.weak = false;
		this.optional = false;
		this.loc = undefined;
	}

	getResourceIdentifier() {
		return null;
	}

	// Returns the referenced module and export
	getReference() {
		if (!this.module) return null;
		return {
			module: this.module,
			weak: this.weak,
			importedNames: true // true: full object, false: only sideeffects/no export, array of strings: the exports with this names
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
}
Dependency.compare = (a, b) => compareLocations(a.loc, b.loc);

module.exports = Dependency;
