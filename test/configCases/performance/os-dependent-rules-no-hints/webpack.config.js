"use strict";

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: false,
		osDependentRules: true
	},
	module: {
		rules: [{ test: /\.js$/, exclude: /node_modules\/left-pad/ }]
	}
};
