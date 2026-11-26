"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: "./loader-1"
			},
			{
				test: /b\.js$/,
				use: "./loader-2"
			},
			{
				test: /c\.js$/,
				use: "./loader-3"
			}
		]
	}
};
