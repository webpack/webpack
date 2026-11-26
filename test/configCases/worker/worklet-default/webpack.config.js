"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				// the dedicated worklet parser with its default syntax
				parser: {
					worklet: true
				}
			}
		]
	}
};
