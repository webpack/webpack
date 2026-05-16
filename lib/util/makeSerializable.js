/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const TypeRegistry = require("../serialization/TypeRegistry");

/** @typedef {import("../serialization/Encoder")} ObjectSerializerContext */
/** @typedef {import("../serialization/Decoder")} ObjectDeserializerContext */
/** @typedef {{ serialize: (context: ObjectSerializerContext) => void, deserialize?: (context: ObjectDeserializerContext) => void }} Serializable */
/** @typedef {(new (...args: EXPECTED_ANY[]) => Serializable) & { deserialize?: (context: ObjectDeserializerContext) => EXPECTED_ANY }} SerializableConstructor */

/**
 * Processes the provided constructor.
 * @param {SerializableConstructor} Constructor the constructor
 * @param {string} request the request which will be required when deserializing
 * @param {string | null=} name the name to make multiple serializer unique when sharing a request
 * @param {EXPECTED_OBJECT=} options codec options
 */
module.exports = (Constructor, request, name = null, options = undefined) => {
	TypeRegistry.register(Constructor, request, name, {
		encode(value, encoder) {
			value.serialize(encoder);
		},
		decode(decoder) {
			if (typeof Constructor.deserialize === "function") {
				return Constructor.deserialize(decoder);
			}
			const value = new Constructor();
			if (typeof value.deserialize !== "function") {
				throw new Error(
					`No deserializer available for ${Constructor.name || request}`
				);
			}
			value.deserialize(decoder);
			return value;
		}
	});
};
