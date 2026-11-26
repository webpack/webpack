"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: "./loader"
			}
		]
	}
};
