"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// Every reference bakes here, so the hint has nothing to say.
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	performance: {
		hints: "warning",
		analyzableBailouts: true
	}
};
