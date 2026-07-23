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
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[WorkletDependencyOptions, Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[WorkletDependencyOptions, Range]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {object} WorkletDependencyOptions
 * @property {string=} publicPath public path for the worklet
 */

// The wrapper param forwarded as the module argument to the original `addModule`.
const WORKLET_MODULE = "__webpack_worklet_module__";

class WorkletDependency extends ModuleDependency {
	/**
	 * Creates an instance of WorkletDependency.
	 * @param {string} request request
	 * @param {Range} range range of the zero-width insertion point (before the call)
	 * @param {Range} callRange range of the call argument list `(<url>)`
	 * @param {WorkletDependencyOptions} workletDependencyOptions options
	 */
	constructor(request, range, callRange, workletDependencyOptions) {
		super(request);
		this.range = range;
		/** @type {Range} */
		this.callRange = callRange;
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
		context.write(this.options).write(this.callRange);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.options = context.read();
		const rest = context.rest;
		this.callRange = rest.read();
		super.deserialize(rest.rest);
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
		const {
			module,
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate
		} = templateContext;
		const dep = /** @type {WorkletDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dependency)
		);
		const entrypoint = /** @type {Entrypoint} */ (
			chunkGraph.getBlockChunkGroup(block)
		);

		const entryChunk = entrypoint.getEntrypointChunk();
		const runtimeChunk = entrypoint.getRuntimeChunk();
		const referencedChunks = entryChunk.getAllReferencedChunks();
		const runtimeChunkId =
			runtimeChunk && runtimeChunk.id !== null ? runtimeChunk.id : null;

		// For ESM module output emit the analyzable `new URL("./worklet.<name>.js",
		// import.meta.url)` form (literal specifier, no runtime helpers) so other bundlers
		// and webpack itself can statically follow the worklet. The worklet chunk links its
		// splits via native `import`, so only the entry chunk is referenced.
		const analyzableSpecifier =
			runtimeTemplate.supportsAnalyzableEsm() && entryChunk.id !== null
				? runtimeTemplate._getAnalyzableChunkSpecifier(
						dep.options.publicPath,
						entryChunk,
						module,
						chunkGraph
					)
				: null;
		if (analyzableSpecifier !== null) {
			source.replace(
				dep.callRange[0],
				dep.callRange[1] - 1,
				`(new URL(/* worklet import */ ${analyzableSpecifier}, ${runtimeTemplate.outputOptions.importMetaName}.url))`
			);
			return;
		}

		const workletImportBaseUrl = dep.options.publicPath
			? JSON.stringify(dep.options.publicPath)
			: RuntimeGlobals.publicPath;

		runtimeRequirements.add(RuntimeGlobals.publicPath);
		runtimeRequirements.add(RuntimeGlobals.baseURI);
		runtimeRequirements.add(RuntimeGlobals.getChunkScriptFilename);

		/**
		 * @param {string | number} id chunk id
		 * @returns {string} `new URL(...)` expression for the chunk file
		 */
		const toUrl = (id) =>
			`new URL(${workletImportBaseUrl} + ${
				RuntimeGlobals.getChunkScriptFilename
			}(${JSON.stringify(id)}), ${RuntimeGlobals.baseURI})`;

		// Module output: the worklet chunk is an ES module that links its split
		// chunks via native `import`, which `addModule` resolves — so add just the
		// entry chunk, with no worker-scope shim and no chunk pre-loading.
		if (runtimeTemplate.isModule() && entryChunk.id !== null) {
			source.replace(
				dep.callRange[0],
				dep.callRange[1] - 1,
				`(${toUrl(entryChunk.id)})`
			);
			return;
		}

		// Fast path: a self-contained worklet (a single chunk, no splits or async
		// `import()`) needs no chunk-loading runtime and no worker-scope shim, so the
		// chunk is `addModule`-d directly with no bootstrap.
		if (referencedChunks.size === 1 && runtimeChunkId !== null) {
			source.replace(
				dep.callRange[0],
				dep.callRange[1] - 1,
				`(${toUrl(runtimeChunkId)})`
			);
			return;
		}

		// A worklet can't load chunks at runtime, so every reachable chunk (initial
		// splits and async `import()` targets alike) is pre-added via `addModule`
		// from the calling scope. The runtime chunk is added last so it installs the
		// chunks pushed before it and runs entry startup with every module present
		// (see ImportScriptsChunkLoadingRuntimeModule).
		/** @type {(string | number)[]} */
		const restChunkIds = [];
		for (const chunk of referencedChunks) {
			if (chunk !== runtimeChunk && chunk.id !== null) {
				restChunkIds.push(chunk.id);
			}
		}

		runtimeRequirements.add(RuntimeGlobals.getWorkletBootstrap);

		const add = "__webpack_worklet_add__";
		const boot = `${add}(${RuntimeGlobals.getWorkletBootstrap}())`;
		// Non-runtime chunks have no ordering constraint, so add them concurrently.
		const addOne = runtimeTemplate.returningFunction(`${add}(u)`, "u");
		const parallel =
			restChunkIds.length > 0
				? `Promise.all([${restChunkIds.map(toUrl).join(", ")}].map(${addOne}))`
				: undefined;
		// The runtime chunk is added last: it runs entry startup with every module present.
		const runtimeAdd =
			runtimeChunkId !== null ? `${add}(${toUrl(runtimeChunkId)})` : undefined;

		// Emit `async`/`await` only where the target supports async functions;
		// otherwise fall back to an equivalent Promise chain (boot → rest → runtime).
		let bootstrap;
		if (runtimeTemplate.supportsAsyncFunction()) {
			bootstrap = Template.asString([
				`async function(${add}) {`,
				Template.indent(
					[
						`await ${boot};`,
						parallel ? `await ${parallel};` : "",
						runtimeAdd ? `await ${runtimeAdd};` : ""
					].filter(Boolean)
				),
				"}"
			]);
		} else {
			let chain = boot;
			if (parallel) {
				chain += `.then(${runtimeTemplate.returningFunction(parallel)})`;
			}
			if (runtimeAdd) {
				chain += `.then(${runtimeTemplate.returningFunction(runtimeAdd)})`;
			}
			bootstrap = `function(${add}) { return ${chain}; }`;
		}

		// The wrapper forwards to the original `addModule` (its callee stays in the
		// source, so the receiver is preserved); a plain function keeps it valid on
		// ES targets without arrow functions.
		source.insert(
			dep.range[0],
			`(/* worklet bootstrap */ ${bootstrap})(function(${WORKLET_MODULE}) { return `
		);
		source.replace(
			dep.callRange[0],
			dep.callRange[1] - 1,
			`(${WORKLET_MODULE}); })`
		);
	}
};

makeSerializable(
	WorkletDependency,
	"webpack/lib/dependencies/WorkletDependency"
);

module.exports = WorkletDependency;
module.exports.WORKLET_MODULE = WORKLET_MODULE;
