"use strict";

const ObjectMiddleware = require("../../../lib/serialization/ObjectMiddleware");

/** Registered only once this file loads, like a class a plugin loads lazily. */
class LateClass {
	/**
	 * @param {number} value value
	 */
	constructor(value) {
		/** @type {number} */
		this.value = value;
	}
}

ObjectMiddleware.register(LateClass, __filename, null, {
	/**
	 * @param {LateClass} item item
	 * @param {import("../../../lib/serialization/ObjectMiddleware").ObjectSerializerContext} context context
	 */
	serialize(item, { write }) {
		write(item.value);
	},
	/**
	 * @param {import("../../../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} context context
	 * @returns {LateClass} item
	 */
	deserialize({ read }) {
		return new LateClass(/** @type {number} */ (read()));
	}
});

module.exports = LateClass;
