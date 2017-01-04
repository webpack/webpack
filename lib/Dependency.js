"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const compareLocations = require("./compareLocations");
class Dependency {
	constructor() {
		this.module = null;
	}

	isEqualResource(other) {
		return false;
	}

	// Returns the referenced module and export
	getReference() {
		if(!this.module) {
			return null;
		}
		return {
			module: this.module,
			importedNames: true
		};
	}

	// Returns the exported names
	getExports() {
		return null;
	}

	getWarnings() {
		return null;
	}

	updateHash(hash) {
		hash.update(`${this.module && this.module.id}`);
	}

	disconnect() {
		this.module = null;
	}

	static compare(a, b) {
		return Dependency.compareLocations(a.loc, b.loc);
	}
}
// todo: this might be useless
Dependency.compareLocations = compareLocations;
module.exports = Dependency;
