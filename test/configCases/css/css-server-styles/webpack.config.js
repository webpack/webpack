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
				type: "css",
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
		uniqueName: "css-server-styles"
	}
};
