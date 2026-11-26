"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				parser: {
					pure: true
				},
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true
	}
};
