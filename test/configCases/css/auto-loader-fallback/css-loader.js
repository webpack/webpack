"use strict";

// Stand-in for a loader whose result is CSS text.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return ".generated { color: blue; }";
};
