/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class SerializerMiddleware {
	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} serialized data
	 */
	serialize(data, context) {
		throw new Error(
			"Serializer.serialize is abstract and need to be overwritten"
		);
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} deserialized data
	 */
	deserialize(data, context) {
		throw new Error(
			"Serializer.deserialize is abstract and need to be overwritten"
		);
	}
}

module.exports = SerializerMiddleware;
