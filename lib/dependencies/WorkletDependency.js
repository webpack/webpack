/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

const Dependency = require("../Dependency");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[WorkletDependencyOptions]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[WorkletDependencyOptions]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {object} WorkletDependencyOptions
 * @property {string=} publicPath public path for the worklet
 */

// The rest arg used by the wrapper to forward the original `addModule` arguments.
const WORKLET_ARGS = "__webpack_worklet_args__";

class WorkletDependency extends ModuleDependency {
	/**
	 * Creates an instance of WorkletDependency.
	 * @param {string} request request
	 * @param {Range} range range of the zero-width insertion point (before the call)
	 * @param {WorkletDependencyOptions} workletDependencyOptions options
	 */
	constructor(request, range, workletDependencyOptions) {
		super(request);
		this.range = range;
		// If options are updated, don't forget to update the hash and serialization functions
		/** @type {WorkletDependencyOptions} */
		this.options = workletDependencyOptions;
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
		return "Worklet.addModule()";
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

WorkletDependency.Template = class WorkletDependencyTemplate extends (
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
		const { chunkGraph, moduleGraph, runtimeRequirements } = templateContext;
		const dep = /** @type {WorkletDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dependency)
		);
		const entrypoint = /** @type {Entrypoint} */ (
			chunkGraph.getBlockChunkGroup(block)
		);

		// A worklet can't load chunks at runtime, so every reachable chunk (initial
		// splits and async `import()` targets alike) is pre-added via `addModule`
		// from the calling scope. The runtime chunk is added last so it installs the
		// chunks pushed before it and runs entry startup with every module present
		// (see ImportScriptsChunkLoadingRuntimeModule).
		const entryChunk = entrypoint.getEntrypointChunk();
		const runtimeChunk = entrypoint.getRuntimeChunk();
		/** @type {(string | number)[]} */
		const restChunkIds = [];
		for (const chunk of entryChunk.getAllReferencedChunks()) {
			if (chunk !== runtimeChunk && chunk.id !== null) {
				restChunkIds.push(chunk.id);
			}
		}
		const runtimeChunkId =
			runtimeChunk && runtimeChunk.id !== null ? runtimeChunk.id : null;

		const workletImportBaseUrl = dep.options.publicPath
			? JSON.stringify(dep.options.publicPath)
			: RuntimeGlobals.publicPath;

		runtimeRequirements.add(RuntimeGlobals.publicPath);
		runtimeRequirements.add(RuntimeGlobals.baseURI);
		runtimeRequirements.add(RuntimeGlobals.getChunkScriptFilename);
		runtimeRequirements.add(RuntimeGlobals.getWorkletBootstrap);

		/**
		 * @param {string | number} id chunk id
		 * @returns {string} `new URL(...)` expression for the chunk file
		 */
		const toUrl = (id) =>
			`new URL(${workletImportBaseUrl} + ${
				RuntimeGlobals.getChunkScriptFilename
			}(${JSON.stringify(id)}), ${RuntimeGlobals.baseURI})`;

		const add = "__webpack_worklet_add__";
		const opts = "__webpack_worklet_opts__";
		// Non-runtime chunks have no ordering constraint between them, so add them
		// concurrently; the runtime chunk is awaited last (it runs entry startup).
		const parallelAdd =
			restChunkIds.length > 0
				? `await Promise.all([${restChunkIds
						.map(toUrl)
						.join(", ")}].map(function(u) { return ${add}(u, ${opts}); }));`
				: "";
		const runtimeAdd =
			runtimeChunkId !== null
				? `await ${add}(${toUrl(runtimeChunkId)}, ${opts});`
				: "";

		const code = Template.asString([
			`(/* worklet bootstrap */ async function(${add}, ${opts}) {`,
			Template.indent(
				[
					`await ${add}(${RuntimeGlobals.getWorkletBootstrap}(), ${opts});`,
					parallelAdd,
					runtimeAdd
				].filter(Boolean)
			),
			`})((...${WORKLET_ARGS}) => `
		]);

		source.insert(dep.range[0], code);
	}
};

makeSerializable(
	WorkletDependency,
	"webpack/lib/dependencies/WorkletDependency"
);

module.exports = WorkletDependency;
module.exports.WORKLET_ARGS = WORKLET_ARGS;
