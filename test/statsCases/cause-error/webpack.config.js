const WebpackError = require("../../../lib/WebpackError");

/** @typedef {Error & { cause?: unknown }} ErrorWithCause */

/**
 * @param {string} message message
 * @param {{ cause: unknown }} options options
 * @returns {ErrorWithCause} error with cause
 */
function createErrorWithCause(message, options) {
	// @ts-expect-error for tests
	const error = new Error(message, options);

	if (typeof (/** @type {ErrorWithCause} */ (error).cause) === "undefined") {
		/** @type {ErrorWithCause} */
		(error).cause = options.cause;
	}

	return error;
}

/** @typedef {WebpackError & { cause?: unknown }} WebpackErrorWithCause */

/**
 * @param {string} message message
 * @param {{ cause: unknown }} options options
 * @returns {WebpackErrorWithCause} error with cause
 */
function createWebpackErrorWithCause(message, options) {
	const error = new WebpackError(message, options);

	if (typeof error.cause === "undefined") {
		/** @type {WebpackErrorWithCause} */
		(error).cause = options.cause;
	}

	return error;
}

/** @typedef {Error & { cause?: unknown, errors: EXPECTED_ANY[] }} AggregateError */

/**
 * @param {EXPECTED_ANY[]} errors errors
 * @param {string} message message
 * @param {{ cause?: unknown }=} options options
 * @returns {AggregateError} error with errors and cause
 */
function createAggregateError(errors, message, options = {}) {
	// @ts-expect-error for tests
	if (typeof AggregateError === "undefined") {
		const error = new Error(message);

		if (options.cause) {
			/** @type {AggregateError} */
			(error).cause = options.cause;
		}

		/** @type {AggregateError} */
		(error).errors = errors;

		return /** @type {AggregateError} */ (error);
	}

	// @ts-expect-error for tests
	return new AggregateError(errors, message, options);
}

/** @type {import("../../../").Configuration} */
module.exports = {
	name: "error cause",
	mode: "development",
	entry: "./index.js",
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				const errCauseErr = createErrorWithCause("error with case", {
					cause: new Error("error case")
				});
				compilation.errors.push(errCauseErr);
				compilation.warnings.push(errCauseErr);
				const errCauseErrCauseErr = createErrorWithCause(
					"error with nested error case",
					{
						cause: createErrorWithCause("test", {
							cause: new Error("nested case")
						})
					}
				);
				compilation.errors.push(errCauseErrCauseErr);
				compilation.warnings.push(errCauseErrCauseErr);
				const errCauseStr = createErrorWithCause("error with string case", {
					cause: "string case"
				});
				compilation.errors.push(errCauseStr);
				compilation.warnings.push(errCauseStr);
				const aggregateError = createAggregateError(
					[
						createErrorWithCause("first error", {
							cause: createErrorWithCause("cause", {
								cause: new Error("nested cause in errors")
							})
						}),
						"second string error",
						createAggregateError(
							[new Error("nested first"), new Error("nested second")],
							"third nested aggregate error"
						)
					],
					"aggregate error",
					{
						cause: createErrorWithCause("cause\ncause\ncause", {
							cause: "nested string cause"
						})
					}
				);
				compilation.errors.push(aggregateError);
				compilation.warnings.push(aggregateError);
				const webpackError = new WebpackError("webpack error");
				compilation.errors.push(webpackError);
				compilation.warnings.push(webpackError);
				const webpackErrorCause = createWebpackErrorWithCause(
					"webpack error with case",
					{
						cause: new Error("cause")
					}
				);
				compilation.errors.push(webpackErrorCause);
				compilation.warnings.push(webpackErrorCause);
			});
		}
	]
};
