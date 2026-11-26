"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {("warning" | "error" | "stats")[]} */
const hints = ["warning", "error", "stats"];

/** @type {Configuration[]} */
module.exports = hints.map((hints) => ({
	mode: "development",
	target: "node",
	performance: {
		hints,
		unusedConfig: true
	},
	externals: {
		first: "commonjs path",
		second: "commonjs path",
		path: "commonjs path",
		"./context/first.js": "commonjs path",
		"./second.js": "commonjs path"
	}
}));
