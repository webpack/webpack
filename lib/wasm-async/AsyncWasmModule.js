/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("../dependencies/ImportPhase").ImportPhaseName} ImportPhaseName */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[ImportPhaseName | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[ImportPhaseName | undefined]>} ObjectSerializerContext */

/**
 * Module class for `webassembly/async` modules. Wasm-specific properties should live here instead of `NormalModule`.
 */
class AsyncWasmModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData & { phase: ImportPhaseName | undefined }} options options object
	 */
	constructor(options) {
		super(options);
		/** @type {ImportPhaseName | undefined} */
		this.phase = options.phase;
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
		context.write(this.phase);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.phase = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(AsyncWasmModule, "webpack/lib/wasm-async/AsyncWasmModule");

module.exports = AsyncWasmModule;
