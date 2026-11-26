"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		name: "changing",
		entry: "./index.js",
		output: {
			clean: false,
			filename: "./bundle.js"
		}
	},
	{
		name: "static",
		entry: "./static-file.js",
		output: {
			clean: false,
			filename: "./static.js"
		}
	}
];
