"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /wrapper-style\.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			},
			{
				test: /base\.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
