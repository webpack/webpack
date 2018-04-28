/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Module")} Module */
/** @typedef {import("crypto").Hash} Hash */
/** @typedef {import("acorn").SourceLocation} SourceLocation */

const compareLocations = require("./compareLocations");
const DependencyReference = require("./dependencies/DependencyReference");

class Dependency {
	constructor() {
		/** @type {Module|null} */
		this.module = null;
		this.weak = false;
		this.optional = false;
		/** @type {SourceLocation=} */
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

	/**
	 * @param {Hash} hash
	 */
	updateHash(hash) {
		hash.update((this.module && this.module.id) + "");
	}

	disconnect() {
		this.module = null;
	}
}
/**
 * @param {Dependency} a first Dependency to compare locations
 * @param {Dependency} b second Dependency to compare locations
 */
Dependency.compare = (a, b) => {
	if (a.loc && b.loc) {
		return compareLocations(a.loc, b.loc);
	}
};

module.exports = Dependency;
