/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("../Module");
const {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} = require("../ModuleSourceTypeConstants");
const { JAVASCRIPT_MODULE_TYPE_ESM } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
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

/**
 * Synthetic ESM module holding a single self-contained, side-effect-free export
 * split off from a host module so the chunk graph can place it independently.
 */
class SplitExportModule extends Module {
	/**
	 * @param {string} hostIdentifier identifier of the host module
	 * @param {string} exportName the exported name carried by this part
	 * @param {string} localName local binding name inside the declaration
	 * @param {string} declaration full declaration source (e.g. `const x = {...}`)
	 */
	constructor(hostIdentifier, exportName, localName, declaration) {
		super(JAVASCRIPT_MODULE_TYPE_ESM, null);
		this.hostIdentifier = hostIdentifier;
		this.exportName = exportName;
		this.localName = localName;
		this.declaration = declaration;
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
		return `split-export|${this.hostIdentifier}|${this.exportName}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `split export ${this.exportName} of ${requestShortener.shorten(
			this.hostIdentifier
		)}`;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return Math.max(1, this.declaration.length);
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
		// The split-off declaration is required to be side-effect-free.
		return false;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ moduleGraph }) {
		const exportsName = this.exportsArgument;
		const used = moduleGraph
			.getExportsInfo(this)
			.getUsedName(this.exportName, undefined);
		const propertyName = JSON.stringify(used || this.exportName);
		const code =
			`${RuntimeGlobals.makeNamespaceObject}(${exportsName});\n` +
			`${RuntimeGlobals.definePropertyGetters}(${exportsName}, { ${propertyName}: () => ${this.localName} });\n` +
			`${this.declaration};\n`;
		/** @type {Sources} */
		const sources = new Map();
		sources.set(JAVASCRIPT_TYPE, new RawSource(code));
		const runtimeRequirements = new Set([
			RuntimeGlobals.exports,
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
		hash.update("split-export");
		hash.update(this.hostIdentifier);
		hash.update(this.exportName);
		hash.update(this.declaration);
		super.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.hostIdentifier);
		write(this.exportName);
		write(this.localName);
		write(this.declaration);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.hostIdentifier = read();
		this.exportName = read();
		this.localName = read();
		this.declaration = read();
		super.deserialize(context);
	}
}

makeSerializable(SplitExportModule, "webpack/lib/optimize/SplitExportModule");

module.exports = SplitExportModule;
