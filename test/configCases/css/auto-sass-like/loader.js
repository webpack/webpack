"use strict";

// Stand-in for a `sass-loader` + `css-loader` chain: returns a JS module.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return `module.exports = ${JSON.stringify("HANDLED_BY_SASS_LIKE_CHAIN")};`;
};
