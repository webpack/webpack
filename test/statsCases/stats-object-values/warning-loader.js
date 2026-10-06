"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function warningLoader(content) {
	this.emitWarning(new Error("__mocked__warning__"));
	return content;
};
