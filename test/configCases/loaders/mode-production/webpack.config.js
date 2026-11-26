"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: "./loader"
			}
		]
	}
};
