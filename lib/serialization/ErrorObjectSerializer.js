/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./types").ComplexSerializableType} ComplexSerializableType */
/** @typedef {import("./ObjectMiddleware").ObjectDeserializerContext<ComplexSerializableType[]>} ObjectDeserializerContext */
/** @typedef {import("./ObjectMiddleware").ObjectSerializerContext<ComplexSerializableType[]>} ObjectSerializerContext */

/** @typedef {Error & { cause?: unknown }} ErrorWithCause */

class ErrorObjectSerializer {
	/**
	 * Creates an instance of ErrorObjectSerializer.
	 * @param {ErrorConstructor | EvalErrorConstructor | RangeErrorConstructor | ReferenceErrorConstructor | SyntaxErrorConstructor | TypeErrorConstructor} Type error type
	 */
	constructor(Type) {
		this.Type = Type;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {Error | EvalError | RangeError | ReferenceError | SyntaxError | TypeError} obj error
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(obj, context) {
		context.write(obj.message);
		context.write(obj.stack);
		context.write(
			/** @type {ComplexSerializableType} */
			(/** @type {ErrorWithCause} */ (obj).cause)
		);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {Error | EvalError | RangeError | ReferenceError | SyntaxError | TypeError} error
	 */
	deserialize(context) {
		const err = new this.Type();

		err.message = /** @type {string} */ (context.read());
		err.stack = /** @type {string | undefined} */ (context.read());
		/** @type {ErrorWithCause} */
		(err).cause = context.read();

		return err;
	}
}

module.exports = ErrorObjectSerializer;
