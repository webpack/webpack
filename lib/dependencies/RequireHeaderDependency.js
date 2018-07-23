/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */

class RequireHeaderDependency extends NullDependency {
	constructor(range) {
		super();
		if (!Array.isArray(range)) throw new Error("range must be valid");
		this.range = range;
	}
}

RequireHeaderDependency.Template = class RequireHeaderDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {RequireHeaderDependency} */ (dependency);
		source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__");
	}

	applyAsTemplateArgument(name, dep, source) {
		source.replace(dep.range[0], dep.range[1] - 1, "require");
	}
};

module.exports = RequireHeaderDependency;
