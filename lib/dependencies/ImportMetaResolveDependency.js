/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Aryan Raj @aryanraj45
*/

"use strict";

const Dependency = require("../Dependency");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ImportMetaResolveDependency extends ModuleDependency {
	/**
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "import.meta.resolve";
	}

	get category() {
		return "url";
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.NO_EXPORTS_REFERENCED;
	}
}

ImportMetaResolveDependency.Template = class ImportMetaResolveDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { chunkGraph, moduleGraph, runtimeRequirements, runtimeTemplate } =
			templateContext;
		const dep = /** @type {ImportMetaResolveDependency} */ (dependency);

		runtimeRequirements.add(RuntimeGlobals.require);
		runtimeRequirements.add(RuntimeGlobals.baseURI);

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			`new URL(${runtimeTemplate.moduleRaw({
				chunkGraph,
				module: /** @type {Module} */ (moduleGraph.getModule(dep)),
				request: dep.request,
				runtimeRequirements,
				weak: false
			})}, ${RuntimeGlobals.baseURI}).href`
		);
	}
};

makeSerializable(
	ImportMetaResolveDependency,
	"webpack/lib/dependencies/ImportMetaResolveDependency"
);

module.exports = ImportMetaResolveDependency;
