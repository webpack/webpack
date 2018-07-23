/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */

class ImportDependency extends ModuleDependency {
	constructor(request, originModule, block) {
		super(request);
		this.originModule = originModule;
		this.block = block;
	}

	get type() {
		return "import()";
	}
}

ImportDependency.Template = class ImportDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ImportDependency} */ (dependency);
		const content = runtimeTemplate.moduleNamespacePromise({
			block: dep.block,
			module: dep.module,
			request: dep.request,
			strict: dep.originModule.buildMeta.strictHarmonyModule,
			message: "import()"
		});

		source.replace(dep.block.range[0], dep.block.range[1] - 1, content);
	}
};

module.exports = ImportDependency;
