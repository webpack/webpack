"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		unusedRules: true
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{ test: /\.never-matches$/, loader: "./loader" }
		]
	}
};
