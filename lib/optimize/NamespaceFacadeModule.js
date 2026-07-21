/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Dependency = require("../Dependency");
const Module = require("../Module");
const {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} = require("../ModuleSourceTypeConstants");
const { JAVASCRIPT_MODULE_TYPE_ESM } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const NullDependency = require("../dependencies/NullDependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../Module").BuildCallback} BuildCallback */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../Generator").SourceTypes} SourceTypes */
/** @typedef {import("../Module").Sources} Sources */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */
/** @typedef {{ exportName: string, sourceModule: Module, sourceName: string }} FacadeEntry */

/**
 * Outgoing edge of a namespace facade to a source module, marking one of its
 * exports as referenced. Emits no code (the facade generates its own source).
 */
class FacadeDependency extends Dependency {
	/**
	 * @param {string} exportName referenced export name
	 */
	constructor(exportName) {
		super();
		this.exportName = exportName;
	}

	get type() {
		return "namespace facade";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return [[this.exportName]];
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.exportName);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.exportName = context.read();
		super.deserialize(context);
	}
}

makeSerializable(
	FacadeDependency,
	"webpack/lib/optimize/NamespaceFacadeModule",
	"FacadeDependency"
);

FacadeDependency.Template = NullDependency.Template;

/**
 * Synthetic ESM module whose namespace re-exposes every export of a split host
 * module, pulling each export from the host or from a split-off part module.
 * Namespace consumers (dynamic `import()` / `import *`) of the host are
 * redirected here so the host's heavy exports can move into the async chunk.
 */
class NamespaceFacadeModule extends Module {
	/**
	 * @param {string} hostIdentifier identifier of the host module
	 * @param {FacadeEntry[]} entries one entry per exposed export
	 */
	constructor(hostIdentifier, entries) {
		super(JAVASCRIPT_MODULE_TYPE_ESM, null);
		this.hostIdentifier = hostIdentifier;
		this.entries = entries;
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `namespace-facade|${this.hostIdentifier}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `namespace facade of ${requestShortener.shorten(
			this.hostIdentifier
		)}`;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}

	/**
	 * Checks whether the module needs to be rebuilt for the current build state.
	 * @param {NeedBuildContext} context context info
	 * @param {NeedBuildCallback} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, !this.buildMeta);
	}

	/**
	 * Builds the module using the provided compilation context.
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildMeta = /** @type {BuildMeta} */ ({
			exportsType: "namespace",
			strictHarmonyModule: true
		});
		this.buildInfo = { cacheable: true, strict: true };
		callback();
	}

	/**
	 * Gets side effects connection state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		return false;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ chunkGraph, moduleGraph, runtime }) {
		const exportsName = this.exportsArgument;
		/** @type {Map<Module, string>} */
		const vars = new Map();
		let head = "";
		const definitions = [];
		for (const entry of this.entries) {
			let varName = vars.get(entry.sourceModule);
			if (varName === undefined) {
				varName = `__webpack_facade_${vars.size}__`;
				vars.set(entry.sourceModule, varName);
				const id = chunkGraph.getModuleId(entry.sourceModule);
				head += `var ${varName} = ${RuntimeGlobals.require}(${JSON.stringify(
					id
				)});\n`;
			}
			const used =
				moduleGraph
					.getExportsInfo(entry.sourceModule)
					.getUsedName(entry.sourceName, runtime) || entry.sourceName;
			const access = `${varName}[${JSON.stringify(used)}]`;
			definitions.push(`${JSON.stringify(entry.exportName)}: () => ${access}`);
		}
		const code = `${RuntimeGlobals.makeNamespaceObject}(${exportsName});\n${
			head
		}${RuntimeGlobals.definePropertyGetters}(${exportsName}, { ${definitions.join(
			", "
		)} });\n`;
		/** @type {Sources} */
		const sources = new Map();
		sources.set(JAVASCRIPT_TYPE, new RawSource(code));
		const runtimeRequirements = new Set([
			RuntimeGlobals.exports,
			RuntimeGlobals.require,
			RuntimeGlobals.makeNamespaceObject,
			RuntimeGlobals.definePropertyGetters
		]);
		return { sources, runtimeRequirements };
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update("namespace-facade");
		hash.update(this.hostIdentifier);
		for (const entry of this.entries) {
			hash.update(entry.exportName);
			hash.update(entry.sourceName);
		}
		super.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.hostIdentifier);
		write(this.entries);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.hostIdentifier = read();
		this.entries = read();
		super.deserialize(context);
	}
}

makeSerializable(
	NamespaceFacadeModule,
	"webpack/lib/optimize/NamespaceFacadeModule"
);

module.exports = NamespaceFacadeModule;
module.exports.FacadeDependency = FacadeDependency;
