/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Dependency from "../Dependency.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("./RemoteModule.js").ExternalRequests} ExternalRequests */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[ExternalRequests]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[ExternalRequests]>} ObjectSerializerContext */

class FallbackDependency extends Dependency {
	/**
	 * Creates an instance of FallbackDependency.
	 * @param {ExternalRequests} requests requests
	 */
	constructor(requests) {
		super();
		/** @type {ExternalRequests} */
		this.requests = requests;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `fallback ${this.requests.join(" ")}`;
	}

	get type() {
		return "fallback";
	}

	get category() {
		return "esm";
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
	 * @returns {FallbackDependency} deserialize fallback dependency
	 */
	static deserialize(context) {
		const obj = new FallbackDependency(context.read());
		obj.deserialize(context.rest);
		return obj;
	}
}

makeSerializable(
	FallbackDependency,
	"webpack/lib/container/FallbackDependency"
);

export default FallbackDependency;

export { FallbackDependency as "module.exports" };
