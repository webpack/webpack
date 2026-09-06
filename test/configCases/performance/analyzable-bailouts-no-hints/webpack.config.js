"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "eval",
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
		hints: false,
		analyzableBailouts: true
	}
};
