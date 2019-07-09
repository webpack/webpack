/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * @template DeserializedType
 * @template SerializedType
 */
class SerializerMiddleware {
	/**
	 * @param {DeserializedType} data data
	 * @param {Object} context context object
	 * @returns {SerializedType|Promise<SerializedType>} serialized data
	 */
	serialize(data, context) {
		throw new Error(
			"Serializer.serialize is abstract and need to be overwritten"
		);
	}

	/**
	 * @param {SerializedType} data data
	 * @param {Object} context context object
	 * @returns {DeserializedType|Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		throw new Error(
			"Serializer.deserialize is abstract and need to be overwritten"
		);
	}
}

module.exports = SerializerMiddleware;
