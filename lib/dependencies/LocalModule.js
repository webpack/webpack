/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, number, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, number, boolean]>} ObjectSerializerContext */

class LocalModule {
	/**
	 * Creates an instance of LocalModule.
	 * @param {string} name name
	 * @param {number} idx index
	 */
	constructor(name, idx) {
		/** @type {string} */
		this.name = name;
		/** @type {number} */
		this.idx = idx;
		/** @type {boolean} */
		this.used = false;
	}

	flagUsed() {
		this.used = true;
	}

	/**
	 * Returns variable name.
	 * @returns {string} variable name
	 */
	variableName() {
		return `__WEBPACK_LOCAL_MODULE_${this.idx}__`;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.name).write(this.idx).write(this.used);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.name = context.read();
		const c1 = context.rest;
		this.idx = c1.read();
		const c2 = c1.rest;
		this.used = c2.read();
	}
}

makeSerializable(LocalModule, "webpack/lib/dependencies/LocalModule");

module.exports = LocalModule;
