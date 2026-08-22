"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		// Keeps the shared module in both chunks, which is what puts one module
		// in front of the report twice.
		splitChunks: false
	},
	performance: {
		hints: "warning",
		largeModules: true
	}
};
