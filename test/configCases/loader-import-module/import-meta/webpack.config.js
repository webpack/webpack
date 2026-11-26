"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	output: {
		module: true
	},
	module: {
		rules: [
			{
				test: /stylesheet\.js$/,
				use: "./loader",
				type: "asset/source"
			}
		]
	}
};
