/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Module from "../Module.js";
import {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} from "../ModuleSourceTypeConstants.js";
import { JAVASCRIPT_MODULE_TYPE_DYNAMIC } from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import makeSerializable from "../util/makeSerializable.js";
import { RawSource } from "../util/webpack-sources.js";

/** @typedef {import("../config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("../Compilation.js").default} Compilation */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Generator.js").SourceTypes} SourceTypes */
/** @typedef {import("../Module.js").BuildCallback} BuildCallback */
/** @typedef {import("../Module.js").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module.js").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("../Module.js").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../Module.js").Sources} Sources */
/** @typedef {import("../RequestShortener.js").default} RequestShortener */
/** @typedef {import("../ResolverFactory.js").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[string]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */
/** @typedef {import("../util/fs.js").InputFileSystem} InputFileSystem */

const RUNTIME_REQUIREMENTS = new Set([
	RuntimeGlobals.require,
	RuntimeGlobals.module
]);

class DllModule extends Module {
	/**
	 * Creates an instance of DllModule.
	 * @param {string} context context path
	 * @param {Dependency[]} dependencies dependencies
	 * @param {string} name name
	 */
	constructor(context, dependencies, name) {
		super(JAVASCRIPT_MODULE_TYPE_DYNAMIC, context);

		// Info from Factory
		/** @type {Dependency[]} */
		this.dependencies = dependencies;
		/** @type {string} */
		this.name = name;
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
		return `dll ${this.name}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `dll ${this.name}`;
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
		this.buildInfo = {};
		return callback();
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		/** @type {Sources} */
		const sources = new Map();
		sources.set(
			JAVASCRIPT_TYPE,
			new RawSource(`module.exports = ${RuntimeGlobals.require};`)
		);
		return {
			sources,
			runtimeRequirements: RUNTIME_REQUIREMENTS
		};
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
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 12;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(`dll module${this.name || ""}`);
		super.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.name);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.name = context.read();
		super.deserialize(context);
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		this.dependencies = module.dependencies;
	}

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache() {
		super.cleanupForCache();
		this.dependencies = /** @type {EXPECTED_ANY} */ (undefined);
	}
}

makeSerializable(DllModule, "webpack/lib/dll/DllModule");

export default DllModule;

export { DllModule as "module.exports" };
