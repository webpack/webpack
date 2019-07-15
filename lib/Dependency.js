/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");
const compareLocations = require("./compareLocations");
const DependencyReference = require("./dependencies/DependencyReference");

/** @typedef {import("./Module")} Module */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./util/createHash").Hash} Hash */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

/** @typedef {Object} SourcePosition
 *  @property {number} line
 *  @property {number=} column
 */

/** @typedef {Object} RealDependencyLocation
 *  @property {SourcePosition} start
 *  @property {SourcePosition=} end
 *  @property {number=} index
 */

/** @typedef {Object} SynteticDependencyLocation
 *  @property {string} name
 *  @property {number=} index
 */

/** @typedef {{exports: string[]|null|true, dependencies: undefined|Module[]}} ExportTypeDefinition **/
/** @typedef {SynteticDependencyLocation|RealDependencyLocation} DependencyLocation */

class Dependency {
	constructor() {
		/** @type {Module|null} */
		this.module = null;
		// TODO remove in webpack 5
		/** @type {boolean} */
		this.weak = false;
		/** @type {boolean} */
		this.optional = false;
		/** @type {DependencyLocation} */
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

	/**
	 * @returns {null|ExportTypeDefinition} the exported names
	 */
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
	 * @param {Hash} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update((this.module && this.module.id) + "");
	}

	disconnect() {
		this.module = null;
	}
}

class DependencyTemplate {
	/**
	 * Applying template
	 * @param {Dependency} dep applying dependency
	 * @param {Source} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @param {Map<Function, DependencyTemplate>} dependencyTemplates all templates
	 * @returns {void}
	 */
	apply(dep, source, runtime, dependencyTemplates) {}
}

Dependency.Template = DependencyTemplate;

// TODO remove in webpack 5
Dependency.compare = util.deprecate(
	(a, b) => compareLocations(a.loc, b.loc),
	"Dependency.compare is deprecated and will be removed in the next major version"
);

exports.DependencyTemplate = DependencyTemplate;
module.exports = Dependency;
