/*
	MIT License https://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @import { ObjectDeserializerContext as GenericObjectDeserializerContext, ObjectSerializerContext as GenericObjectSerializerContext } from "./ObjectMiddleware.js" */

/** @typedef {GenericObjectDeserializerContext<[string, string]>} ObjectDeserializerContext */
/** @typedef {GenericObjectSerializerContext<[string, string]>} ObjectSerializerContext */

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

module.exports = RegExpObjectSerializer;
