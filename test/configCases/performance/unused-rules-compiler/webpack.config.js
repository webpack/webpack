"use strict";

/** @import { Configuration } from "../../../../" */

// The rule below is inactive in this compiler by design, so the plugin must
// stay silent — any warning fails the case.
/** @type {Configuration} */
module.exports = {
	name: "main-compiler",
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{
				test: /\.js$/,
				compiler: "other-compiler",
				loader: "./loader"
			}
		]
	}
};
