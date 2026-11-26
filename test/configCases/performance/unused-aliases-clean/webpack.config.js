"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	resolve: {
		alias: {
			"@alias/exact": path.resolve(__dirname, "exact.js"),
			"@alias/dir": path.resolve(__dirname, "dir")
		}
	}
};
