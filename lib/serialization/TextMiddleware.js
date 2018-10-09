/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const SerializerMiddleware = require("./SerializerMiddleware");

class TextMiddleware extends SerializerMiddleware {
	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} serialized data
	 */
	serialize(data, context) {
		return [Buffer.from(JSON.stringify(data))];
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} deserialized data
	 */
	deserialize(data, context) {
		return JSON.parse(Buffer.concat(data).toString());
	}
}

module.exports = TextMiddleware;
