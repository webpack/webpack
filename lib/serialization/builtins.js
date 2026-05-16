/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./TypeRegistry").Codec} Codec */

/**
 * @param {EXPECTED_ANY} Type error constructor
 * @returns {Codec} codec
 */
const errorCodec = (Type) => ({
	/**
	 * @param {Error} error error
	 * @param {import("./Encoder")} encoder encoder
	 * @returns {void}
	 */
	encode(error, encoder) {
		encoder.setCircularReference(error);
		encoder.write(error.message);
		encoder.write(error.stack);
		encoder.write(error.cause);
	},
	/**
	 * @param {import("./Decoder")} decoder decoder
	 * @returns {Error} error
	 */
	decode(decoder) {
		const error = new Type();
		decoder.setCircularReference(error);
		error.message = decoder.read();
		error.stack = decoder.read();
		error.cause = decoder.read();
		return error;
	}
});

/** @type {Codec} */
const aggregateErrorCodec = {
	/**
	 * @param {AggregateError} error error
	 * @param {import("./Encoder")} encoder encoder
	 * @returns {void}
	 */
	encode(error, encoder) {
		encoder.setCircularReference(error);
		encoder.write(error.errors);
		encoder.write(error.message);
		encoder.write(error.stack);
		encoder.write(error.cause);
	},
	/**
	 * @param {import("./Decoder")} decoder decoder
	 * @returns {AggregateError} error
	 */
	decode(decoder) {
		// eslint-disable-next-line n/no-unsupported-features/es-builtins, n/no-unsupported-features/es-syntax, unicorn/error-message
		const error = new AggregateError(decoder.read());
		decoder.setCircularReference(error);
		error.message = decoder.read();
		error.stack = decoder.read();
		error.cause = decoder.read();
		return error;
	}
};

/**
 * @param {typeof import("./TypeRegistry")} registry registry
 * @returns {void}
 */
const registerBuiltins = (registry) => {
	registry.registerBuiltin(Error, "", "Error", errorCodec(Error));
	registry.registerBuiltin(EvalError, "", "EvalError", errorCodec(EvalError));
	registry.registerBuiltin(
		RangeError,
		"",
		"RangeError",
		errorCodec(RangeError)
	);
	registry.registerBuiltin(
		ReferenceError,
		"",
		"ReferenceError",
		errorCodec(ReferenceError)
	);
	registry.registerBuiltin(
		SyntaxError,
		"",
		"SyntaxError",
		errorCodec(SyntaxError)
	);
	registry.registerBuiltin(TypeError, "", "TypeError", errorCodec(TypeError));
	// eslint-disable-next-line n/no-unsupported-features/es-builtins, n/no-unsupported-features/es-syntax
	if (typeof AggregateError !== "undefined") {
		registry.registerBuiltin(
			// eslint-disable-next-line n/no-unsupported-features/es-builtins, n/no-unsupported-features/es-syntax
			AggregateError,
			"",
			"AggregateError",
			aggregateErrorCodec
		);
	}
};

module.exports = { registerBuiltins };
