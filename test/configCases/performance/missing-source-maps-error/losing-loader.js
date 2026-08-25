"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	// Rewrites the code and returns no map, which is the case being reported.
	return source.replace("__REPLACED__", "1");
};
