/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class SetObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template T
	 * @param {Set<T>} obj set
	 * @param {import("./ObjectMiddleware").ObjectSerializerContext<(number | T)[]>} context context
	 */
	serialize(obj, context) {
		context.write(obj.size);
		for (const value of obj) {
			context.write(value);
		}
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @template T
	 * @param {import("./ObjectMiddleware").ObjectDeserializerContext<(number | T)[]>} context context
	 * @returns {Set<T>} date
	 */
	deserialize(context) {
		const size = /** @type {number} */ (context.read());
		/** @type {Set<T>} */
		const set = new Set();
		for (let i = 0; i < size; i++) {
			set.add(/** @type {T} */ (context.read()));
		}
		return set;
	}
}

module.exports = SetObjectSerializer;
