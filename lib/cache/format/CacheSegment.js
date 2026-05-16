/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");

/** @typedef {import("../../Cache").Data} Data */
/** @typedef {import("../../serialization/Encoder")} ObjectSerializerContext */
/** @typedef {import("../../serialization/Decoder")} ObjectDeserializerContext */

class CacheSegment {
	/**
	 * @param {Map<string, Data>=} items items
	 */
	constructor(items = new Map()) {
		this.items = items;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 * @returns {void}
	 */
	serialize({ write }) {
		write(this.items);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {void}
	 */
	deserialize({ read }) {
		this.items = read();
	}
}

makeSerializable(
	CacheSegment,
	"webpack/lib/cache/format/CacheSegment",
	"CacheSegment"
);

module.exports = CacheSegment;
