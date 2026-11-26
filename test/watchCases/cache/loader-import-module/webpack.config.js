"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.generate-json\.js$/,
				use: "./loader",
				type: "json"
			}
		]
	}
};
