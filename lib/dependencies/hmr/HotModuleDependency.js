/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ModuleDependency = require("../core/ModuleDependency");

/** @import { ImportAttributes } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[ImportAttributes | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[ImportAttributes | undefined]>} ObjectSerializerContext */

/**
 * A request of `module.hot.accept` or `decline`, with the import attributes
 * the call passes, as in `accept("./a.css", { with: { type: "css" } })`.
 */
class HotModuleDependency extends ModuleDependency {
	/**
	 * Creates an instance of HotModuleDependency.
	 * @param {string} request the request string
	 * @param {number=} sourceOrder source order
	 */
	constructor(request, sourceOrder) {
		super(request, sourceOrder);
		/** @type {ImportAttributes | undefined} */
		this.attributes = undefined;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		const identifier = super.getResourceIdentifier();
		return this.attributes
			? `${identifier}|attributes${JSON.stringify(this.attributes)}`
			: identifier;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.attributes);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.attributes = context.read();
		super.deserialize(context.rest);
	}
}

module.exports = HotModuleDependency;
