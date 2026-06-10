/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("../NormalModuleFactory").ResolveData} ResolveData */
/** @typedef {import("../dependencies/ImportPhase").ImportPhaseName} ImportPhaseName */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/**
 * Module class for `webassembly/async` modules. Wasm-specific properties should live here instead of `NormalModule`.
 */
class AsyncWasmModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData & { phase?: ImportPhaseName }} options options object
	 * @param {ResolveData=} resolveData resolve data, when created by the factory
	 */
	constructor(options, resolveData) {
		super(options);
		this.phase = resolveData ? resolveData.phase : options.phase;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		let str = super.identifier();

		if (this.phase) {
			str = `${str}|${this.phase}`;
		}

		return str;
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
		const m = /** @type {AsyncWasmModule} */ (module);
		this.phase = m.phase;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.phase);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.phase = read();
		super.deserialize(context);
	}
}

makeSerializable(AsyncWasmModule, "webpack/lib/wasm-async/AsyncWasmModule");

module.exports = AsyncWasmModule;
