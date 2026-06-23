/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, string, string | false, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, string, string | false, boolean]>} ObjectSerializerContext */

class ProvideSharedDependency extends Dependency {
	/**
	 * Creates an instance of ProvideSharedDependency.
	 * @param {string} shareScope share scope
	 * @param {string} name module name
	 * @param {string | false} version version
	 * @param {string} request request
	 * @param {boolean} eager true, if this is an eager dependency
	 */
	constructor(shareScope, name, version, request, eager) {
		super();
		/** @type {string} */
		this.shareScope = shareScope;
		/** @type {string} */
		this.name = name;
		/** @type {string | false} */
		this.version = version;
		/** @type {string} */
		this.request = request;
		/** @type {boolean} */
		this.eager = eager;
	}

	get type() {
		return "provide shared module";
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `provide module (${this.shareScope}) ${this.request} as ${
			this.name
		} @ ${this.version}${this.eager ? " (eager)" : ""}`;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.shareScope)
			.write(this.name)
			.write(this.request)
			.write(this.version)
			.write(this.eager);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {ProvideSharedDependency} deserialize fallback dependency
	 */
	static deserialize(context) {
		// wire order is shareScope, name, request, version, eager;
		// reorder into the constructor's (…, version, request, …) signature
		const shareScope = context.read();
		const c1 = context.rest;
		const name = c1.read();
		const c2 = c1.rest;
		const request = c2.read();
		const c3 = c2.rest;
		const version = c3.read();
		const c4 = c3.rest;
		const eager = c4.read();
		const obj = new ProvideSharedDependency(
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
	ProvideSharedDependency,
	"webpack/lib/sharing/ProvideSharedDependency"
);

module.exports = ProvideSharedDependency;
