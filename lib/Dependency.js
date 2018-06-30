/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const compareLocations = require("./compareLocations");
const DependencyReference = require("./dependencies/DependencyReference");

/** @typedef {Object} Position
 *  @property {number} column
 *  @property {number} line
 */

/** @typedef {Object} Loc
 *  @property {Position} start
 *  @property {Position} end
 */

class Dependency {
	constructor() {
		this.module = null;
		// TODO remove in webpack 5
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
		return new DependencyReference(this.module, true, this.weak);
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
