/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Daniel Kuschny @danielku15
*/

"use strict";

const ModuleDependency = require("./ModuleDependency");

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate")} DependencyTemplate */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */

/** @typedef {import("../javascript/JavascriptParser").Range} Range */

class WorkletDependency extends ModuleDependency {
	/**
	 * @param {string} url The module URL which should be launched as worklet.
	 * @param {Range} range The range in the source code which this dependency will replace.
	 * @param {Object} workletDependencyOptions options The options of this dependency
	 * @param {string=} workletDependencyOptions.publicPath public path to resolve worklet URLs
	 * @param {(chunk:Chunk)=>string} workletDependencyOptions.getChunkFileName The function to use for getting the filename of a chunk
	 */
	constructor(url, range, workletDependencyOptions) {
		super(url);
		this.range = range;
		this.options = workletDependencyOptions;
	}
}

const WORKLET_ADD_MODULE_ARGS = "__webpack_worklet_args__";

class WorkletDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { chunkGraph, moduleGraph, runtimeRequirements } = templateContext;
		const dep = /** @type {WorkletDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dependency)
		);
		const entrypoint = /** @type {Entrypoint} */ (
			chunkGraph.getBlockChunkGroup(block)
		);
		const chunk = entrypoint.getEntrypointChunk();
		// We use the workerPublicPath option if provided, else we fallback to the RuntimeGlobal publicPath
		const workletImportBaseUrl = dep.options.publicPath
			? `"${dep.options.publicPath}"`
			: RuntimeGlobals.publicPath;

		runtimeRequirements.add(RuntimeGlobals.publicPath);
		runtimeRequirements.add(RuntimeGlobals.baseURI);
		runtimeRequirements.add(RuntimeGlobals.getWorkletBootstrapFilename);

		source.insert(
			dep.range[0],
			Template.asString([
				"(/* worklet bootstrap */ async function(__webpack_worklet_addmodule__, __webpack_worklet_options__) {",
				Template.indent([
					`await __webpack_worklet_addmodule__(${RuntimeGlobals.getWorkletBootstrapFilename}(), __webpack_worklet_options__);`,
					...Array.from(chunk.getAllReferencedChunks()).map(
						c =>
							`await __webpack_worklet_addmodule__(new URL(${workletImportBaseUrl} + ${JSON.stringify(dep.options.getChunkFileName(c))}, ${RuntimeGlobals.baseURI}), __webpack_worklet_options__);`
					)
				]),
				`})( (...${WORKLET_ADD_MODULE_ARGS}) => `
			])
		);
	}
}

WorkletDependency.Template = WorkletDependencyTemplate;

module.exports = WorkletDependency;
module.exports.WORKLET_ADD_MODULE_ARGS = WORKLET_ADD_MODULE_ARGS;
