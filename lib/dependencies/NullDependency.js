/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

/** @typedef {import("../util/createHash").Hash} Hash */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../Dependency")} Dependency **/
/** @typedef {import('../Dependency').DependencyTemplate} DependencyTemplate **/
/** @typedef {{exports: string[], dependencies: undefined}} ExportTypeDefinition **/

/**
 * @typedef {Object} HarmonyInitDependencyTemplate
 * @property {function(Dependency, ReplaceSource, RuntimeTemplate, Map<Function, DependencyTemplate>): void} apply
 * @property {function(Dependency, ReplaceSource, RuntimeTemplate, Map<Function, DependencyTemplate>): void} harmonyInit
 * @property {function(Dependency): number} getHarmonyInitOrder
 */

class NullDependency extends Dependency {
	/**
	 * @returns {string} dependency type
	 */
	get type() {
		return "null";
	}

	/**
	 * @param {Hash} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {}
}

NullDependency.Template = class NullDependencyTemplate {
	/**
	 * @param {Dependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @param {Map<Function, DependencyTemplate | HarmonyInitDependencyTemplate>} dependencyTemplates dependencies map
	 * @returns {void}
	 */
	apply(dep, source, runtime, dependencyTemplates) {}
};

module.exports = NullDependency;
