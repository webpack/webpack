"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /string\.js$/,
				use: ["./check-string-loader", "./bom-loader"]
			},
			{
				test: /buffer\.js$/,
				use: ["./check-buffer-loader", "./bom-loader"]
			}
		]
	}
};
