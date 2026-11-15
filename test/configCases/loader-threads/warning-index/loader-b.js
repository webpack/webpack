"use strict";
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	this.emitWarning(new Error("worker warning"));
	return source;
};
