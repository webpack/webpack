/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {string[]} Keys */

class NullPrototypeObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template {object} T
	 * @param {T} obj null object
	 * @param {import("./ObjectMiddleware").ObjectSerializerContext<(string | null | T[keyof T])[]>} context context
	 */
	serialize(obj, context) {
		/** @type {Keys} */
		const keys = Object.keys(obj);
		for (const key of keys) {
			context.write(key);
		}
		context.write(null);
		for (const key of keys) {
			context.write(obj[/** @type {keyof T} */ (key)]);
		}
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @template {object} T
	 * @param {import("./ObjectMiddleware").ObjectDeserializerContext<(string | null | T[keyof T])[]>} context context
	 * @returns {T} null object
	 */
	deserialize(context) {
		/** @type {T} */
		const obj = Object.create(null);
		/** @type {Keys} */
		const keys = [];
		let key = /** @type {string | null} */ (context.read());
		while (key !== null) {
			keys.push(key);
			key = /** @type {string | null} */ (context.read());
		}
		for (const key of keys) {
			obj[/** @type {keyof T} */ (key)] = /** @type {T[keyof T]} */ (
				context.read()
			);
		}
		return obj;
	}
}

module.exports = NullPrototypeObjectSerializer;
