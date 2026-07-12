/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

/** @typedef {import("./ObjectMiddleware.js").ObjectDeserializerContext<[string, string]>} ObjectDeserializerContext */
/** @typedef {import("./ObjectMiddleware.js").ObjectSerializerContext<[string, string]>} ObjectSerializerContext */

class RegExpObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {RegExp} obj regexp
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(obj, context) {
		context.write(obj.source);
		context.write(obj.flags);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {RegExp} regexp
	 */
	deserialize(context) {
		return new RegExp(context.read(), context.read());
	}
}

export default RegExpObjectSerializer;

export { RegExpObjectSerializer as "module.exports" };
