"use strict";

// Minimal stand-in for css-loader: turns a `.css` file into a JS module.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return `module.exports = ${JSON.stringify("LOADED_BY_CUSTOM_LOADER")};`;
};
