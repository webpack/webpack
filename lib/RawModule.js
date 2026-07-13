/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Module from "./Module.js";
import {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} from "./ModuleSourceTypeConstants.js";
import { JAVASCRIPT_MODULE_TYPE_DYNAMIC } from "./ModuleTypeConstants.js";
import makeSerializable from "./util/makeSerializable.js";
import { OriginalSource, RawSource } from "./util/webpack-sources.js";

/** @typedef {import("./config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("./Compilation.js").default} Compilation */
/** @typedef {import("./Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./Generator.js").SourceTypes} SourceTypes */
/** @typedef {import("./Module.js").BuildCallback} BuildCallback */
/** @typedef {import("./Module.js").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module.js").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("./Module.js").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module.js").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */
/** @typedef {import("./Module.js").Sources} Sources */
/** @typedef {import("./ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection.js").ConnectionState} ConnectionState */
/** @typedef {import("./RequestShortener.js").default} RequestShortener */
/** @typedef {import("./ResolverFactory.js").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string, string, string, ReadOnlyRuntimeRequirements | null]>} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectSerializerContext<[string, string, string, ReadOnlyRuntimeRequirements | null]>} ObjectSerializerContext */
/** @typedef {import("./util/Hash.js").default} Hash */
/** @typedef {import("./util/fs.js").InputFileSystem} InputFileSystem */

class RawModule extends Module {
	/**
	 * Creates an instance of RawModule.
	 * @param {string} source source code
	 * @param {string} identifier unique identifier
	 * @param {string=} readableIdentifier readable identifier
	 * @param {ReadOnlyRuntimeRequirements=} runtimeRequirements runtime requirements needed for the source code
	 */
	constructor(source, identifier, readableIdentifier, runtimeRequirements) {
		super(JAVASCRIPT_MODULE_TYPE_DYNAMIC, null);
		/** @type {string} */
		this.sourceStr = source;
		/** @type {string} */
		this.identifierStr = identifier || this.sourceStr;
		/** @type {string} */
		this.readableIdentifierStr = readableIdentifier || this.identifierStr;
		/** @type {ReadOnlyRuntimeRequirements | null} */
		this.runtimeRequirements = runtimeRequirements || null;
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
		return this.identifierStr;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return Math.max(1, this.sourceStr.length);
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return /** @type {string} */ (
			requestShortener.shorten(this.readableIdentifierStr)
		);
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
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: true
		};
		callback();
	}

	/**
	 * Gets side effects connection state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		if (this.factoryMeta !== undefined) {
			if (this.factoryMeta.sideEffectFree) return false;
			if (this.factoryMeta.sideEffectFree === false) return true;
		}
		return true;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		/** @type {Sources} */
		const sources = new Map();
		if (this.sourceMapKind !== "none") {
			sources.set(
				JAVASCRIPT_TYPE,
				new OriginalSource(this.sourceStr, this.identifier())
			);
		} else {
			sources.set(JAVASCRIPT_TYPE, new RawSource(this.sourceStr));
		}
		return { sources, runtimeRequirements: this.runtimeRequirements };
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.sourceStr);
		super.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.sourceStr)
			.write(this.identifierStr)
			.write(this.readableIdentifierStr)
			.write(this.runtimeRequirements);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.sourceStr = context.read();
		const c1 = context.rest;
		this.identifierStr = c1.read();
		const c2 = c1.rest;
		this.readableIdentifierStr = c2.read();
		const c3 = c2.rest;
		this.runtimeRequirements = c3.read();

		super.deserialize(c3.rest);
	}
}

makeSerializable(RawModule, "webpack/lib/RawModule");

export default RawModule;

export { RawModule as "module.exports" };
