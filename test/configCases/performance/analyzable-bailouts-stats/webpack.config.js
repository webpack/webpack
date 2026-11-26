"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: "eval",
	output: {
		module: true
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	performance: {
		hints: "stats",
		analyzableBailouts: true
	}
};
