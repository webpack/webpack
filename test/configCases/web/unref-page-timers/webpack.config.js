"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		target: "web",
		output: { filename: "bundle0.js" }
	},
	{
		target: "web",
		output: { module: true, filename: "bundle1.mjs" }
	}
];
