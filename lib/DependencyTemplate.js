/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./InitFragment")} InitFragment */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

/**
 * @typedef {Object} DependencyTemplateContext
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {Module} module current module
 */

class DependencyTemplate {
	/**
	 * @abstract
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		throw new Error("DependencyTemplate.apply must be overriden");
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, templateContext) {
		return null;
	}
}

module.exports = DependencyTemplate;
