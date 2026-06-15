"use strict";

module.exports = function supportsObjectHasOwn() {
	// `Object.hasOwn` is es2022; cast to avoid a hard type reference for the
	// test tsconfig's older `lib` target
	return typeof (/** @type {EXPECTED_ANY} */ (Object).hasOwn) === "function";
};
