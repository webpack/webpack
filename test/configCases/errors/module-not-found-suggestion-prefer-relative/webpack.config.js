"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	// A module request resolves next to its origin too, so the hint has to look
	// there as well as in the module directories
	resolve: { preferRelative: true }
};
