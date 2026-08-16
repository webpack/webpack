"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		osDependentRules: true
	},
	module: {
		// Exactly one flagged condition, so the message reads in the singular.
		rules: [{ test: /\.js$/, exclude: /node_modules\/left-pad/ }]
	}
};
