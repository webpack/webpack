/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { ErrorWithHideStack } from "./ModuleBuildError" */
/** @import WebpackError from "./WebpackError" */

/**
 * Returns the nested error's stack without its leading "Name: message" line.
 * @param {ErrorWithHideStack} nestedError the wrapped error
 * @returns {string | undefined} frames of the nested stack
 */
const getNestedFrames = (nestedError) => {
	const stack = nestedError.stack;
	if (!stack) return undefined;
	const firstLineEnd = stack.indexOf("\n");
	return firstLineEnd === -1 ? "" : stack.slice(firstLineEnd + 1);
};

/**
 * Derives `details` — or, for a `hideStack` error, `stack` — of a diagnostic
 * that wraps `nestedError`. V8 formats a stack trace only when it is read, and
 * a diagnostic is normally printed without one (stats needs `errorDetails` or
 * `errorStack` for that), so the derived string is materialized on first
 * access: a build with thousands of dependency warnings would otherwise spend a
 * large share of its time formatting stacks that nothing ever reads.
 * @param {WebpackError} error the wrapping diagnostic
 * @param {ErrorWithHideStack | undefined} nestedError the wrapped error
 * @returns {void}
 */
const deriveStackFromNestedError = (error, nestedError) => {
	if (!nestedError) return;
	if (nestedError.hideStack) {
		// the frames are hidden, but they are still prepended to the own stack
		const ownStack =
			/** @type {PropertyDescriptor} */
			(Object.getOwnPropertyDescriptor(error, "stack"));
		/** @type {string | undefined} */
		let stack;
		let computed = false;
		Object.defineProperty(error, "stack", {
			configurable: true,
			enumerable: false,
			get() {
				if (!computed) {
					computed = true;
					const own = ownStack.get ? ownStack.get.call(error) : ownStack.value;
					const frames = getNestedFrames(nestedError);
					stack = frames === undefined ? own : `${frames}\n\n${own}`;
					// older V8 replaces the own `stack` accessor when it is first read
					Object.defineProperty(error, "stack", {
						configurable: true,
						enumerable: false,
						writable: true,
						value: stack
					});
				}
				return stack;
			},
			set(value) {
				computed = true;
				stack = value;
			}
		});
		return;
	}
	/** @type {string | undefined} */
	let details;
	let computed = false;
	Object.defineProperty(error, "details", {
		configurable: true,
		enumerable: true,
		get() {
			if (!computed) {
				computed = true;
				details = getNestedFrames(nestedError);
			}
			return details;
		},
		set(value) {
			computed = true;
			details = value;
		}
	});
};

module.exports = deriveStackFromNestedError;
