"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	this.emitWarning(new Error("this is a warning"));
	this.emitError(new Error("this is an error"));
	return source;
};
