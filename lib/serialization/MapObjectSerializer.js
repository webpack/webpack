/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class MapObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template K, V
	 * @param {Map<K, V>} obj map
	 * @param {import("./ObjectMiddleware").ObjectSerializerContext<(number | K | V)[]>} context context
	 */
	serialize(obj, context) {
		context.write(obj.size);
		for (const key of obj.keys()) {
			context.write(key);
		}
		for (const value of obj.values()) {
			context.write(value);
		}
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @template K, V
	 * @param {import("./ObjectMiddleware").ObjectDeserializerContext<(number | K | V)[]>} context context
	 * @returns {Map<K, V>} map
	 */
	deserialize(context) {
		const size = /** @type {number} */ (context.read());
		/** @type {Map<K, V>} */
		const map = new Map();
		/** @type {K[]} */
		const keys = [];
		for (let i = 0; i < size; i++) {
			keys.push(/** @type {K} */ (context.read()));
		}
		for (let i = 0; i < size; i++) {
			map.set(keys[i], /** @type {V} */ (context.read()));
		}
		return map;
	}
}

module.exports = MapObjectSerializer;
