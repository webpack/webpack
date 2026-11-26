"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	node: { __dirname: false, __filename: false },
	output: { publicPath: "auto" },
	module: {
		rules: [
			{
				test: /\.png$/,
				resourceQuery: /own=/,
				generator: { publicPath: "/own/" }
			}
		]
	},
	experiments: { css: true }
};
