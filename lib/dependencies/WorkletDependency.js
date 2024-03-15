/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Daniel Kuschny @danielku15
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const Template = require("../Template");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate")} DependencyTemplate */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */

/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

class WorkletDependency extends ModuleDependency {
	/**
	 * @param {string} url The module URL which should be launched as worklet.
	 * @param {Range} range The range in the source code which this dependency will replace.
	 * @param {Object} workletDependencyOptions options The options of this dependency
	 * @param {string=} workletDependencyOptions.publicPath public path to resolve worklet URLs
	 */
	constructor(url, range, workletDependencyOptions) {
		super(url);
		this.range = range;
		this.options = workletDependencyOptions;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @returns {void}
	 */
	updateHash(hash) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = JSON.stringify(this.options);
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.options);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.options = read();
		super.deserialize(context);
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
		runtimeRequirements.add(RuntimeGlobals.getWorkletChunks);

		chunkGraph.addChunkRuntimeRequirements(
			chunk,
			new Set([RuntimeGlobals.getWorkletChunksIsWorklet])
		);

		source.insert(
			dep.range[0],
			Template.asString([
				"(/* worklet bootstrap */ async function(__webpack_worklet_addmodule__, __webpack_worklet_options__) {",
				Template.indent([
					`await __webpack_worklet_addmodule__(${RuntimeGlobals.getWorkletBootstrapFilename}(), __webpack_worklet_options__);`,
					`for (const fileName of ${RuntimeGlobals.getWorkletChunks}(${chunk.id})) {`,
					Template.indent([
						`await __webpack_worklet__.addModule(new URL(${workletImportBaseUrl} + fileName, ${RuntimeGlobals.baseURI}), __webpack_worklet_options__);`
					])
				]),
				`})( (...${WORKLET_ADD_MODULE_ARGS}) => `
			])
		);
	}
}

WorkletDependency.Template = WorkletDependencyTemplate;

makeSerializable(
	WorkletDependency,
	"webpack/lib/dependencies/WorkletDependency"
);

module.exports = WorkletDependency;
module.exports.WORKLET_ADD_MODULE_ARGS = WORKLET_ADD_MODULE_ARGS;
