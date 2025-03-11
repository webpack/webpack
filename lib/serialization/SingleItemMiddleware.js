/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const SerializerMiddleware = require("./SerializerMiddleware");

/** @typedef {import("./SerializerMiddleware").Context} Context */

/** @typedef {any} DeserializedType */
/** @typedef {any[]} SerializedType */

/**
 * @extends {SerializerMiddleware<DeserializedType, SerializedType>}
 */
class SingleItemMiddleware extends SerializerMiddleware {
	/**
	 * @param {DeserializedType} data data
	 * @param {Context} context context object
	 * @returns {SerializedType | Promise<SerializedType> | null} serialized data
	 */
	serialize(data, context) {
		return [data];
	}

	/**
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @returns {DeserializedType | Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		return data[0];
	}
}

module.exports = SingleItemMiddleware;
