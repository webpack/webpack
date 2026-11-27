"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	node: { __dirname: false },
	module: {
		rules: [
			{
				test: /style\.module\.css$/,
				use: [path.resolve(__dirname, "loader.js")]
			}
		]
	},
	experiments: { css: true }
};
