/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class ImportEagerDependency extends ModuleDependency {
	constructor(request, originModule, range) {
		super(request);
		this.originModule = originModule;
		this.range = range;
	}

	get type() {
		return "import() eager";
	}
}

ImportEagerDependency.Template = class ImportEagerDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeTemplate, moduleGraph }) {
		const dep = /** @type {ImportEagerDependency} */ (dependency);
		const content = runtimeTemplate.moduleNamespacePromise({
			module: dep.module,
			request: dep.request,
			strict: dep.originModule.buildMeta.strictHarmonyModule,
			message: "import() eager"
		});
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};

module.exports = ImportEagerDependency;
