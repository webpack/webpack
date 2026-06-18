/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const Dependency = require("../Dependency");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[WorkerDependencyOptions]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[WorkerDependencyOptions]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * Represents the worker dependency runtime component.
 * @typedef {object} WorkerDependencyOptions
 * @property {string=} publicPath public path for the worker
 * @property {boolean=} needNewUrl true when need generate `new URL(...)`, otherwise false
 * @property {Range=} workerConstructorRange range of the global `Worker` constructor, set only for the `new Worker()` global syntax that needs a node-target rewrite
 */

class WorkerDependency extends ModuleDependency {
	/**
	 * Creates an instance of WorkerDependency.
	 * @param {string} request request
	 * @param {Range} range range
	 * @param {WorkerDependencyOptions} workerDependencyOptions options
	 */
	constructor(request, range, workerDependencyOptions) {
		super(request);
		this.range = range;
		// If options are updated, don't forget to update the hash and serialization functions
		/** @type {WorkerDependencyOptions} */
		this.options = workerDependencyOptions;
		/** Cache the hash */
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.NO_EXPORTS_REFERENCED;
	}

	get type() {
		return "new Worker()";
	}

	get category() {
		return "worker";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = JSON.stringify(this.options);
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.options);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.options = context.read();
		super.deserialize(context.rest);
	}
}

WorkerDependency.Template = class WorkerDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { chunkGraph, moduleGraph, runtimeRequirements, runtimeTemplate } =
			templateContext;
		const dep = /** @type {WorkerDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dependency)
		);
		const entrypoint = /** @type {Entrypoint} */ (
			chunkGraph.getBlockChunkGroup(block)
		);
		const chunk = entrypoint.getEntrypointChunk();
		// We use the workerPublicPath option if provided, else we fallback to the RuntimeGlobal publicPath
		const workerImportBaseUrl = dep.options.publicPath
			? `"${dep.options.publicPath}"`
			: RuntimeGlobals.publicPath;

		runtimeRequirements.add(RuntimeGlobals.publicPath);
		runtimeRequirements.add(RuntimeGlobals.baseURI);
		runtimeRequirements.add(RuntimeGlobals.getChunkScriptFilename);

		const workerImportStr = `/* worker import */ ${workerImportBaseUrl} + ${
			RuntimeGlobals.getChunkScriptFilename
		}(${JSON.stringify(chunk.id)}), ${RuntimeGlobals.baseURI}`;

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			dep.options.needNewUrl ? `new URL(${workerImportStr})` : workerImportStr
		);

		// `Worker` is global only on the web, so route node (universal or node-only) through `worker_threads`
		const { platform } = runtimeTemplate.compilation.compiler;
		const ctorRange = dep.options.workerConstructorRange;
		if (
			ctorRange &&
			(runtimeTemplate.isUniversalTarget() || (platform.node && !platform.web))
		) {
			runtimeRequirements.add(RuntimeGlobals.worker);
			source.replace(ctorRange[0], ctorRange[1] - 1, RuntimeGlobals.worker);
		}
	}
};

makeSerializable(WorkerDependency, "webpack/lib/dependencies/WorkerDependency");

module.exports = WorkerDependency;
