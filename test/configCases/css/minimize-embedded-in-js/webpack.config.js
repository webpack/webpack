"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false },
	module: {
		rules: [
			{
				test: /embedded\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	// The defaults wire `minimizer-webpack-plugin` with jsMinify / cssMinify /
	// htmlMinify, so this is what a user gets from `mode: "production"` alone.
	optimization: {
		minimize: { css: { extractComments: false } },
		minimizer: ["..."]
	},
	experiments: { css: true }
};
