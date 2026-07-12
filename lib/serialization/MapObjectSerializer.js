/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

class MapObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template K, V
	 * @param {Map<K, V>} obj map
	 * @param {import("./ObjectMiddleware.js").ObjectSerializerContext<(number | K | V)[]>} context context
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
	 * @param {import("./ObjectMiddleware.js").ObjectDeserializerContext<(number | K | V)[]>} context context
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

export default MapObjectSerializer;

export { MapObjectSerializer as "module.exports" };
