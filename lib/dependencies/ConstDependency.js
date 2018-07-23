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

class ConstDependency extends NullDependency {
	constructor(expression, range, requireWebpackRequire) {
		super();
		this.expression = expression;
		this.range = range;
		this.requireWebpackRequire = requireWebpackRequire;
	}

	updateHash(hash) {
		hash.update(this.range + "");
		hash.update(this.expression + "");
	}
}

ConstDependency.Template = class ConstDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ConstDependency} */ (dependency);
		if (typeof dep.range === "number") {
			source.insert(dep.range, dep.expression);
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
	}
};

module.exports = ConstDependency;
