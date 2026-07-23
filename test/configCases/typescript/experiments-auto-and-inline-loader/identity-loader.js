"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	// Passes the TypeScript source through untouched: the built-in strip-types
	// must still run afterwards even though a loader was applied via an inline
	// request (not registered in `module.rules`).
	return source;
};
