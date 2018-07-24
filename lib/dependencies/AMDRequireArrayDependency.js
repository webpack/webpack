/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class AMDRequireArrayDependency extends Dependency {
	constructor(depsArray, range) {
		super();
		this.depsArray = depsArray;
		this.range = range;
	}

	get type() {
		return "amd require array";
	}
}

AMDRequireArrayDependency.Template = class AMDRequireArrayDependencyTemplate extends DependencyTemplate {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeTemplate, moduleGraph }) {
		const dep = /** @type {AMDRequireArrayDependency} */ (dependency);
		const content = this.getContent(dep, { runtimeTemplate, moduleGraph });
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, { runtimeTemplate, moduleGraph }) {
		const requires = dep.depsArray.map(dependency => {
			return this.contentForDependency(dependency, {
				runtimeTemplate,
				moduleGraph
			});
		});
		return `[${requires.join(", ")}]`;
	}

	contentForDependency(dep, { runtimeTemplate, moduleGraph }) {
		if (typeof dep === "string") {
			return dep;
		}

		if (dep.localModule) {
			return dep.localModule.variableName();
		} else {
			return runtimeTemplate.moduleExports({
				module: dep.module,
				request: dep.request
			});
		}
	}
};

module.exports = AMDRequireArrayDependency;
