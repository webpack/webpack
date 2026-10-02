/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { register, registerLegacyRequest } = require("./serialization");

/**
 * @import {
 * 	Constructor,
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */

/** @typedef {{ serialize: (context: ObjectSerializerContext) => void, deserialize: (context: ObjectDeserializerContext) => void }} SerializableClass */
/**
 * Defines the serializable class constructor type used by this module.
 * @template {SerializableClass} T
 * @typedef {(new (...params: EXPECTED_ANY[]) => T) & { deserialize?: (context: ObjectDeserializerContext) => T }} SerializableClassConstructor
 */

/**
 * Represents ClassSerializer.
 * @template {SerializableClass} T
 */
class ClassSerializer {
	/**
	 * Creates an instance of ClassSerializer.
	 * @param {SerializableClassConstructor<T>} Constructor constructor
	 */
	constructor(Constructor) {
		/** @type {SerializableClassConstructor<T>} */
		this.Constructor = Constructor;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {T} obj obj
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(obj, context) {
		obj.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {T} obj
	 */
	deserialize(context) {
		if (typeof this.Constructor.deserialize === "function") {
			return this.Constructor.deserialize(context);
		}
		const obj = new this.Constructor();
		obj.deserialize(context);
		return obj;
	}
}

/**
 * Registers the constructor with the serializer. Pass an array of requests to
 * keep requests the class was written under before a move readable: the first
 * is the one it is written under now, the rest restore older cache packs; a
 * historical entry written under another name pairs its request with it.
 * @template {Constructor} T
 * @param {T} Constructor the constructor
 * @param {string | (string | [string, string | null])[]} request the request which will be required when deserializing, current one first
 * @param {string | null=} name the name to make multiple serializer unique when sharing a request
 */
module.exports = (Constructor, request, name = null) => {
	const requests = Array.isArray(request) ? request : [request];
	register(
		Constructor,
		/** @type {string} */ (requests[0]),
		name,
		new ClassSerializer(Constructor)
	);
	// TODO in the next major release: remove, dropping every request but the
	// first from each caller, which stops pre-move cache packs loading
	for (let i = 1; i < requests.length; i++) {
		const legacy = requests[i];
		if (typeof legacy === "string") {
			registerLegacyRequest(Constructor, legacy, name);
		} else {
			registerLegacyRequest(Constructor, legacy[0], legacy[1]);
		}
	}
};
