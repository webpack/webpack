"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	},
	output: {
		module: true
	}
};
