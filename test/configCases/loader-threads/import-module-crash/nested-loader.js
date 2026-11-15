"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const callback = this.async();

	this.emitFile("nested.txt", "nested");
	setTimeout(() => callback(null, source), 100);
};
