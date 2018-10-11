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

class ImportDependency extends ModuleDependency {
	constructor(request, block) {
		super(request);

		this.block = block;
	}

	get type() {
		return "import()";
	}

	serialize(context) {
		const { write } = context;

		write(this.block);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.block = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ImportDependency,
	"webpack/lib/dependencies/ImportDependency "
);

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
		{ runtimeTemplate, module, moduleGraph, chunkGraph }
	) {
		const dep = /** @type {ImportDependency} */ (dependency);
		const content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			block: dep.block,
			module: moduleGraph.getModule(dep),
			request: dep.request,
			strict: module.buildMeta.strictHarmonyModule,
			message: "import()"
		});

		source.replace(dep.block.range[0], dep.block.range[1] - 1, content);
	}
};

module.exports = ImportDependency;
