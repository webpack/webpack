"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	this.emitFile("emitted.txt", "emitted");
	return source;
};
