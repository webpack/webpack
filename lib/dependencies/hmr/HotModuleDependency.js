/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ModuleDependency = require("../core/ModuleDependency");

/** @import Module from "../../module/Module" */
/** @import { ImportAttributes } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[ImportAttributes | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[ImportAttributes | undefined]>} ObjectSerializerContext */

/**
 * A request of `module.hot.accept` or `decline`, which names the module the
 * accepting module imports, attributes included.
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

	/**
	 * The attributes the module's static imports of a request share, so an
	 * accept of it names the module they import.
	 * @param {Module} module the accepting module
	 * @param {string} request the accepted request
	 * @returns {ImportAttributes | undefined} the attributes, undefined when none or they differ
	 */
	static getImportAttributes(module, request) {
		/** @type {ImportAttributes | undefined} */
		let attributes;
		let found = false;
		for (const dependency of module.dependencies) {
			if (
				/** @type {ModuleDependency} */ (dependency).request !== request ||
				dependency.type !== "harmony side effect evaluation"
			) {
				continue;
			}
			const current =
				/** @type {ModuleDependency & { attributes?: ImportAttributes }} */
				(dependency).attributes;
			if (!found) {
				attributes = current;
				found = true;
			} else if (JSON.stringify(current) !== JSON.stringify(attributes)) {
				return;
			}
		}
		return attributes;
	}
}

module.exports = HotModuleDependency;
