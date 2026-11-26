"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		entry: ["./index.mjs"],
		output: {
			module: false
		}
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
