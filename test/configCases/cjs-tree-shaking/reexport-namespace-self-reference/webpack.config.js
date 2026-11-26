"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /\.cjs$/,
				exclude: /effectful/,
				sideEffects: false
			}
		]
	},
	optimization: {
		minimize: false
	}
};
