/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class ErrorObjectSerializer {
	/**
	 * @param {ErrorConstructor | EvalErrorConstructor | RangeErrorConstructor | ReferenceErrorConstructor | SyntaxErrorConstructor | TypeErrorConstructor} Type error type
	 */
	constructor(Type) {
		this.Type = Type;
	}
	/**
	 * @param {Error | EvalError | RangeError | ReferenceError | SyntaxError | TypeError} obj error
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(obj, context) {
		context.write(obj.message);
		context.write(obj.stack);
	}
	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {Error | EvalError | RangeError | ReferenceError | SyntaxError | TypeError} error
	 */
	deserialize(context) {
		const err = new this.Type();

		err.message = context.read();
		err.stack = context.read();

		return err;
	}
}

module.exports = ErrorObjectSerializer;
