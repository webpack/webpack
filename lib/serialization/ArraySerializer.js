/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

class ArraySerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template T
	 * @param {T[]} array array
	 * @param {import("./ObjectMiddleware.js").ObjectSerializerContext<(number | T)[]>} context context
	 */
	serialize(array, context) {
		context.write(array.length);
		for (const item of array) context.write(item);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @template T
	 * @param {import("./ObjectMiddleware.js").ObjectDeserializerContext<(number | T)[]>} context context
	 * @returns {T[]} array
	 */
	deserialize(context) {
		const length = /** @type {number} */ (context.read());
		/** @type {T[]} */
		const array = [];
		for (let i = 0; i < length; i++) {
			array.push(/** @type {T} */ (context.read()));
		}
		return array;
	}
}

export default ArraySerializer;

export { ArraySerializer as "module.exports" };
