"use strict";

// Stand-in for a loader whose result is JavaScript, not CSS.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return `module.exports = ${JSON.stringify("LOADED_BY_CUSTOM_LOADER")};`;
};
