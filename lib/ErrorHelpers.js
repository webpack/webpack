/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const memoize = require("./util/memoize");

/** @import RequestShortener from "./RequestShortener" */

const getNonErrorEmittedError = memoize(() =>
	require("./errors/NonErrorEmittedError")
);

const loaderFlag = "LOADER_EXECUTION";

const webpackOptionsFlag = "WEBPACK_OPTIONS";

// Every frame of a stack is indented, so a line opening with `at ` after
// whitespace is a frame rather than a part of the message itself.
const STACK_FRAME_REGEXP = /^\s+at\s/;

// `at name (file:line:column)`, and the `at file:line:column` a frame with no
// name is written as.
const STACK_FRAME_FILE_REGEXP = /^(\s+at\s(?:.*\()?)(.+?):(\d+):(\d+)(\)?)$/;

// A generated function nests its parentheses and carries a position of its
// own, so each `file:line:column` in it is read on its own.
const GENERATED_FRAME_REGEXP = /\beval at /;
const POSITION_REGEXP = /([^\s()]+):\d+:\d+/g;

const WEBPACK_SOURCE_PATH = path.join(__dirname, path.sep);

/**
 * Returns stack trace without the specified flag included.
 * @param {string} stack stack trace
 * @param {string} flag flag to cut off
 * @returns {string} stack trace without the specified flag included
 */
const cutOffByFlag = (stack, flag) => {
	const errorStack = stack.split("\n");
	for (let i = 0; i < errorStack.length; i++) {
		if (errorStack[i].includes(flag)) {
			errorStack.length = i;
		}
	}
	return errorStack.join("\n");
};

/**
 * Cut off loader execution.
 * @param {string} stack stack trace
 * @returns {string} stack trace without the loader execution flag included
 */
const cutOffLoaderExecution = (stack) => cutOffByFlag(stack, loaderFlag);

/**
 * Cut off webpack options.
 * @param {string} stack stack trace
 * @returns {string} stack trace without the webpack options flag included
 */
const cutOffWebpackOptions = (stack) => cutOffByFlag(stack, webpackOptionsFlag);

/**
 * Cut off multiline message.
 * @param {string} stack stack trace
 * @param {string} message error message
 * @returns {string} stack trace without the message included
 */
const cutOffMultilineMessage = (stack, message) => {
	const stackSplitByLines = stack.split("\n");
	const messageSplitByLines = message.split("\n");

	/** @type {string[]} */
	const result = [];

	for (const [idx, line] of stackSplitByLines.entries()) {
		if (!line.includes(messageSplitByLines[idx])) result.push(line);
	}

	return result.join("\n");
};

/**
 * Returns stack trace without the message included.
 * @param {string} stack stack trace
 * @param {string} message error message
 * @returns {string} stack trace without the message included
 */
const cutOffMessage = (stack, message) => {
	const nextLine = stack.indexOf("\n");
	if (nextLine === -1) {
		return stack === message ? "" : stack;
	}
	const firstLine = stack.slice(0, nextLine);
	return firstLine === message ? stack.slice(nextLine + 1) : stack;
};

/**
 * Returns the value as an error, naming whatever a tap, a loader or a plugin
 * failed with when that is not one. Everything reading a failure expects one.
 * @param {EXPECTED_ANY} value value something failed with
 * @returns {Error} the value, or an error naming it
 */
const toError = (value) => {
	if (value instanceof Error) return value;
	const error = new (getNonErrorEmittedError())(value);
	// The wrapping is not the site: the stack starts where the value was caught.
	Error.captureStackTrace(error, toError);
	return error;
};

/**
 * Returns whether a rebuild of the same project names the same position in the
 * file. Webpack's own sources move with a release, and the engine's with it.
 * @param {string} file file a stack frame names
 * @returns {boolean} whether the position is worth keeping
 */
const isReproduciblePosition = (file) =>
	!file.startsWith(WEBPACK_SOURCE_PATH) && !file.startsWith("node:");

/**
 * Returns the message with every stack frame naming its file relative to the
 * context, and a position only where {@link isReproduciblePosition} allows one.
 * @param {string} message error message
 * @param {RequestShortener} requestShortener request shortener
 * @returns {string} message whose frames a second build writes the same way
 */
const contextifyStackFrames = (message, requestShortener) =>
	message
		.split("\n")
		.map((line) => {
			if (!STACK_FRAME_REGEXP.test(line)) return line;
			if (GENERATED_FRAME_REGEXP.test(line)) {
				return line.replace(
					POSITION_REGEXP,
					(position, file) =>
						/** @type {string} */ (requestShortener.shorten(file))
				);
			}
			const match = STACK_FRAME_FILE_REGEXP.exec(line);
			if (match === null) return line;
			const [, frame, file, lineNumber, column, end] = match;
			const position = isReproduciblePosition(file)
				? `:${lineNumber}:${column}`
				: "";
			return `${frame}${requestShortener.shorten(file)}${position}${end}`;
		})
		.join("\n");

/**
 * Returns stack trace without the loader execution flag and message included.
 * @param {string} stack stack trace
 * @param {string} message error message
 * @returns {string} stack trace without the loader execution flag and message included
 */
const cleanUp = (stack, message) => {
	stack = cutOffLoaderExecution(stack);
	stack = cutOffMessage(stack, message);
	return stack;
};

/**
 * Clean up webpack options.
 * @param {string} stack stack trace
 * @param {string} message error message
 * @returns {string} stack trace without the webpack options flag and message included
 */
const cleanUpWebpackOptions = (stack, message) => {
	stack = cutOffWebpackOptions(stack);
	stack = cutOffMultilineMessage(stack, message);
	return stack;
};

module.exports.cleanUp = cleanUp;
module.exports.cleanUpWebpackOptions = cleanUpWebpackOptions;
module.exports.contextifyStackFrames = contextifyStackFrames;
module.exports.cutOffByFlag = cutOffByFlag;
module.exports.cutOffLoaderExecution = cutOffLoaderExecution;
module.exports.cutOffMessage = cutOffMessage;
module.exports.cutOffMultilineMessage = cutOffMultilineMessage;
module.exports.cutOffWebpackOptions = cutOffWebpackOptions;
module.exports.toError = toError;
