"use strict";

/** @import { Configuration } from "../../../" */

// `mode` is left unset so each child reports exactly one warning
/** @type {Configuration[]} */
module.exports = [
	{
		entry: "./index",
		output: { filename: "a.js" },
		stats: { all: false, errorsCount: true, warningsCount: true }
	},
	{
		entry: "./index",
		output: { filename: "b.js" },
		stats: { all: false, errorsCount: true, warningsCount: true }
	}
];
