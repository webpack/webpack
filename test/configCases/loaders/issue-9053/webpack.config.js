"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /c\.js$/,
				use: ["loader2"]
			},
			{
				test: /d\.js$/,
				use: ["loader3"]
			}
		]
	}
};
