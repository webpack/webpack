/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./InitFragment")} InitFragment */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

class DependencyTemplate {
	/**
	 * @abstract
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		throw new Error("DependencyTemplate.apply must be overriden");
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, runtimeTemplate, dependencyTemplates) {
		return null;
	}
}

module.exports = DependencyTemplate;
