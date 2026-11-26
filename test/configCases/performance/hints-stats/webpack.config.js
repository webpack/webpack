"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedConfig: true
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{ test: /\.never-matches$/, loader: "./loader" }
		]
	}
};
