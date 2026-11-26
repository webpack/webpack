/*
	MIT License https://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @import { ComplexSerializableType } from "./types.js" */
/** @import { ObjectDeserializerContext as GenericObjectDeserializerContext, ObjectSerializerContext as GenericObjectSerializerContext } from "./ObjectMiddleware.js" */
/** @typedef {GenericObjectDeserializerContext<ComplexSerializableType[]>} ObjectDeserializerContext */
/** @typedef {GenericObjectSerializerContext<ComplexSerializableType[]>} ObjectSerializerContext */

/** @typedef {Error & { cause?: ComplexSerializableType, errors: ComplexSerializableType[] }} AggregateError */

class AggregateErrorSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {AggregateError} obj error
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(obj, context) {
		context.write(obj.errors);
		context.write(obj.message);
		context.write(obj.stack);
		context.write(obj.cause);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {AggregateError} error
	 */
	deserialize(context) {
		const errors = /** @type {ComplexSerializableType[]} */ (context.read());
		const message = /** @type {string} */ (context.read());
		// eslint-disable-next-line n/no-unsupported-features/es-builtins, n/no-unsupported-features/es-syntax
		const err = new AggregateError(errors, message);

		err.stack = /** @type {string | undefined} */ (context.read());
		err.cause = context.read();

		return /** @type {AggregateError} */ (err);
	}
}

module.exports = AggregateErrorSerializer;
