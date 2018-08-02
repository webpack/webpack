/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class UnsupportedDependency extends NullDependency {
	constructor(request, range) {
		super();
		this.request = request;
		this.range = range;
	}
}

UnsupportedDependency.Template = class UnsupportedDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {UnsupportedDependency} */ (dependency);
		source.replace(
			dep.range[0],
			dep.range[1],
			runtimeTemplate.missingModule({
				request: dep.request
			})
		);
	}
};

module.exports = UnsupportedDependency;
