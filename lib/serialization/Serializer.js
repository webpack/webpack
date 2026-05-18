/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Decoder = require("./Decoder");
const Encoder = require("./Encoder");

/** @typedef {{ context?: Record<string, EXPECTED_ANY>, fileStore?: import("./FileStore") }} SerializerOptions */

class Serializer {
	/**
	 * @param {SerializerOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {SerializerOptions} */
		this.options = options;
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @param {Record<string, EXPECTED_ANY>=} context context
	 * @returns {Buffer | null} serialized buffer
	 */
	serialize(value, context = {}) {
		return new Encoder({
			context: { ...context, ...this.options.context },
			fileStore: this.options.fileStore,
			lazyTarget: this
		}).serialize(value);
	}

	/**
	 * @param {Buffer} buffer buffer
	 * @param {Record<string, EXPECTED_ANY>=} context context
	 * @returns {EXPECTED_ANY} value
	 */
	deserialize(buffer, context = {}) {
		return new Decoder(buffer, {
			context: { ...context, ...this.options.context },
			fileStore: this.options.fileStore,
			lazyTarget: this
		}).deserialize();
	}
}

module.exports = Serializer;
