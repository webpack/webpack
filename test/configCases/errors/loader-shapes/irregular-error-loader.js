"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader() {
	const empty = /** @type {EXPECTED_ANY} */ (null);
	const emptyError = new Error("");
	this.emitWarning(empty);
	this.emitWarning(emptyError);
	this.emitError(empty);
	this.emitError(emptyError);
	// eslint-disable-next-line no-throw-literal
	throw "a string error";
};
