/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../dependencies/ImportDependenciesBlock")} ImportDependenciesBlock */

class ImportDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "import()";
	}
}

makeSerializable(ImportDependency, "webpack/lib/dependencies/ImportDependency");

ImportDependency.Template = class ImportDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		const dep = /** @type {ImportDependency} */ (dependency);
		const block = /** @type {ImportDependenciesBlock} */ (moduleGraph.getParentBlock(
			dep
		));
		const content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			block: block,
			module: moduleGraph.getModule(dep),
			request: dep.request,
			strict: module.buildMeta.strictHarmonyModule,
			message: "import()",
			runtimeRequirements
		});

		source.replace(block.range[0], block.range[1] - 1, content);
	}
};

module.exports = ImportDependency;
