/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

import Module from "../Module.js";
import {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} from "../ModuleSourceTypeConstants.js";
import { WEBPACK_MODULE_TYPE_FALLBACK } from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import makeSerializable from "../util/makeSerializable.js";
import { RawSource } from "../util/webpack-sources.js";
import FallbackItemDependency from "./FallbackItemDependency.js";

/** @typedef {import("../config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("../Chunk.js").default} Chunk */
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Module.js").BuildCallback} BuildCallback */
/** @typedef {import("../Module.js").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module.js").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module.js").LibIdent} LibIdent */
/** @typedef {import("../Module.js").NameForCondition} NameForCondition */
/** @typedef {import("../Module.js").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("../Module.js").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../Module.js").Sources} Sources */
/** @typedef {import("../Module.js").SourceTypes} SourceTypes */
/** @typedef {import("../RequestShortener.js").default} RequestShortener */
/** @typedef {import("../ResolverFactory.js").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[ExternalRequests]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[ExternalRequests]>} ObjectSerializerContext */
/** @typedef {import("../util/fs.js").InputFileSystem} InputFileSystem */
/** @typedef {import("./RemoteModule.js").ExternalRequests} ExternalRequests */

const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);

class FallbackModule extends Module {
	/**
	 * Creates an instance of FallbackModule.
	 * @param {ExternalRequests} requests list of requests to choose one
	 */
	constructor(requests) {
		super(WEBPACK_MODULE_TYPE_FALLBACK);
		/** @type {ExternalRequests} */
		this.requests = requests;
		/** @type {string} */
		this._identifier = `fallback ${this.requests.join(" ")}`;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return this._identifier;
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `${this.layer ? `(${this.layer})/` : ""}webpack/container/fallback/${
			this.requests[0]
		}/and ${this.requests.length - 1} more`;
	}

	/**
	 * Returns true if the module can be placed in the chunk.
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true if the module can be placed in the chunk
	 */
	chunkCondition(chunk, { chunkGraph }) {
		return chunkGraph.getNumberOfEntryModules(chunk) > 0;
	}

	/**
	 * Checks whether the module needs to be rebuilt for the current build state.
	 * @param {NeedBuildContext} context context info
	 * @param {NeedBuildCallback} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(null, !this.buildInfo);
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
			strict: true
		};

		this.clearDependenciesAndBlocks();
		for (const request of this.requests) {
			this.addDependency(new FallbackItemDependency(request));
		}

		callback();
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return this.requests.length * 5 + 42;
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const ids = this.dependencies.map((dep) =>
			chunkGraph.getModuleId(/** @type {Module} */ (moduleGraph.getModule(dep)))
		);
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const code = Template.asString([
			`${cst} ids = ${JSON.stringify(ids)};`,
			`${lt} error, result, i = 0;`,
			`${cst} loop = ${runtimeTemplate.basicFunction("next", [
				"while(i < ids.length) {",
				Template.indent([
					`try { next = ${RuntimeGlobals.require}(ids[i++]); } catch(e) { return handleError(e); }`,
					"if(next) return next.then ? next.then(handleResult, handleError) : handleResult(next);"
				]),
				"}",
				"if(error) throw error;"
			])}`,
			`${cst} handleResult = ${runtimeTemplate.basicFunction("result", [
				"if(result) return result;",
				"return loop();"
			])};`,
			`${cst} handleError = ${runtimeTemplate.basicFunction("e", [
				"error = e;",
				"return loop();"
			])};`,
			"module.exports = loop();"
		]);
		/** @type {Sources} */
		const sources = new Map();
		sources.set(JAVASCRIPT_TYPE, new RawSource(code));
		return { sources, runtimeRequirements: RUNTIME_REQUIREMENTS };
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.requests);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {FallbackModule} deserialized fallback module
	 */
	static deserialize(context) {
		const { read } = context;
		const obj = new FallbackModule(read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(FallbackModule, "webpack/lib/container/FallbackModule");

export default FallbackModule;

export { FallbackModule as "module.exports" };
