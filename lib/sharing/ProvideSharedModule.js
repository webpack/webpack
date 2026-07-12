/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

import AsyncDependenciesBlock from "../AsyncDependenciesBlock.js";
import Module from "../Module.js";
import { SHARED_INIT_TYPES } from "../ModuleSourceTypeConstants.js";
import { WEBPACK_MODULE_TYPE_PROVIDE } from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import makeSerializable from "../util/makeSerializable.js";
import ProvideForSharedDependency from "./ProvideForSharedDependency.js";
/** @typedef {import("../config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Module.js").BuildCallback} BuildCallback */
/** @typedef {import("../Module.js").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module.js").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module.js").LibIdent} LibIdent */
/** @typedef {import("../Module.js").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("../Module.js").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../Module.js").Sources} Sources */
/** @typedef {import("../Module.js").SourceTypes} SourceTypes */
/** @typedef {import("../Module.js").CodeGenerationResultData} CodeGenerationResultData */
/** @typedef {import("../RequestShortener.js").default} RequestShortener */
/** @typedef {import("../ResolverFactory.js").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string, string, string | false, string, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[string, string, string | false, string, boolean]>} ObjectSerializerContext */
/** @typedef {import("../util/fs.js").InputFileSystem} InputFileSystem */

class ProvideSharedModule extends Module {
	/**
	 * Creates an instance of ProvideSharedModule.
	 * @param {string} shareScope shared scope name
	 * @param {string} name shared key
	 * @param {string | false} version version
	 * @param {string} request request to the provided module
	 * @param {boolean} eager include the module in sync way
	 */
	constructor(shareScope, name, version, request, eager) {
		super(WEBPACK_MODULE_TYPE_PROVIDE);
		/** @type {string} */
		this._shareScope = shareScope;
		/** @type {string} */
		this._name = name;
		/** @type {string | false} */
		this._version = version;
		/** @type {string} */
		this._request = request;
		/** @type {boolean} */
		this._eager = eager;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `provide module (${this._shareScope}) ${this._name}@${this._version}|${this._request}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `provide shared module (${this._shareScope}) ${this._name}@${
			this._version
		} = ${requestShortener.shorten(this._request)}`;
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `${this.layer ? `(${this.layer})/` : ""}webpack/sharing/provide/${
			this._shareScope
		}/${this._name}`;
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
		const dep = new ProvideForSharedDependency(this._request);
		if (this._eager) {
			this.addDependency(dep);
		} else {
			const block = new AsyncDependenciesBlock({});
			block.addDependency(dep);
			this.addBlock(block);
		}

		callback();
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
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return SHARED_INIT_TYPES;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate, chunkGraph }) {
		const runtimeRequirements = new Set([RuntimeGlobals.initializeSharing]);
		const code = `register(${JSON.stringify(this._name)}, ${JSON.stringify(
			this._version || "0"
		)}, ${
			this._eager
				? runtimeTemplate.syncModuleFactory({
						dependency: this.dependencies[0],
						chunkGraph,
						request: this._request,
						runtimeRequirements
					})
				: runtimeTemplate.asyncModuleFactory({
						block: this.blocks[0],
						chunkGraph,
						request: this._request,
						runtimeRequirements
					})
		}${this._eager ? ", 1" : ""});`;
		/** @type {Sources} */
		const sources = new Map();
		/** @type {CodeGenerationResultData} */
		const data = new Map();
		data.set("share-init", [
			{
				shareScope: this._shareScope,
				initStage: 10,
				init: code
			}
		]);
		return { sources, data, runtimeRequirements };
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this._shareScope)
			.write(this._name)
			.write(this._version)
			.write(this._request)
			.write(this._eager);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {ProvideSharedModule} deserialize fallback dependency
	 */
	static deserialize(context) {
		const shareScope = context.read();
		const c1 = context.rest;
		const name = c1.read();
		const c2 = c1.rest;
		const version = c2.read();
		const c3 = c2.rest;
		const request = c3.read();
		const c4 = c3.rest;
		const eager = c4.read();
		const obj = new ProvideSharedModule(
			shareScope,
			name,
			version,
			request,
			eager
		);
		obj.deserialize(c4.rest);
		return obj;
	}
}

makeSerializable(
	ProvideSharedModule,
	"webpack/lib/sharing/ProvideSharedModule"
);

export default ProvideSharedModule;

export { ProvideSharedModule as "module.exports" };
