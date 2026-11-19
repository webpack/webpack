/*
	MIT License https://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../module/NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * @import {
 * 	NormalModuleBuildInfo,
 * 	NormalModuleCreateData
 * } from "../module/NormalModule"
 */
/** @import JsonData from "./JsonData" */
/** @import Module, { BuildMeta } from "../module/Module" */
/** @import { JsonParserOptions } from "../../declarations/WebpackOptions" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[boolean]>} ObjectSerializerContext */

/**
 * Defines the build info properties specific to json modules.
 * @typedef {object} KnownJsonModuleBuildInfo
 * @property {JsonData=} jsonData
 */

/** @typedef {NormalModuleBuildInfo & KnownJsonModuleBuildInfo} JsonModuleBuildInfo */

/**
 * A json module before or after its build, typed with its build info.
 * @typedef {NormalModule & { buildInfo?: JsonModuleBuildInfo }} JsonNormalModule
 */

/**
 * A built json module, typed with its build info and build meta.
 * @typedef {NormalModule & { buildInfo: JsonModuleBuildInfo, buildMeta: BuildMeta }} BuiltJsonModule
 */

/**
 * Module class for `json` modules. JSON-specific properties should live here instead of `NormalModule`.
 */
class JsonModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the json specific shape
		/** @type {JsonModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		const parserOptions =
			/** @type {JsonParserOptions | undefined} */
			(options.parserOptions);
		// own state, as the cache clears `parserOptions`
		/** @type {boolean} */
		this.defaultOnly = Boolean(
			parserOptions && parserOptions.namedExports === false
		);
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		const identifier = super.identifier();
		// `with { type: "json" }` reads only `default`, so its module is apart from
		// a plain import of the file; right after the type, so no layer can match
		return this.defaultOnly
			? `${this.type}|default-only${identifier.slice(this.type.length)}`
			: identifier;
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
		this.defaultOnly = /** @type {JsonModule} */ (module).defaultOnly;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.defaultOnly);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.defaultOnly = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(JsonModule, "webpack/lib/json/JsonModule");

module.exports = JsonModule;
