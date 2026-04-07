/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cleanUp } = require("./ErrorHelpers");
const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/**
 * Wraps an underlying module processing error with webpack-specific message,
 * details, and serialization support.
 */
class ModuleError extends WebpackError {
	/**
	 * Creates a webpack error for a failure that occurred while processing a
	 * module.
	 * @param {Error} err error thrown
	 * @param {{ from?: string | null }} info additional info
	 */
	constructor(err, { from = null } = {}) {
		let message = "Module Error";

		message += from ? ` (from ${from}):\n` : ": ";

		if (err && typeof err === "object" && err.message) {
			message += err.message;
		} else if (err) {
			message += err;
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleError";
		/** @type {Error} */
		this.error = err;
		/** @type {string | undefined} */
		this.details =
			err && typeof err === "object" && err.stack
				? cleanUp(err.stack, this.message)
				: undefined;
	}

	/**
	 * Serializes the wrapped error before delegating to the base webpack error
	 * serializer.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;

		write(this.error);

		super.serialize(context);
	}

	/**
	 * Restores the wrapped error and then deserializes the shared webpack error
	 * state.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;

		this.error = read();

		super.deserialize(context);
	}
}

makeSerializable(ModuleError, "webpack/lib/ModuleError");

module.exports = ModuleError;
