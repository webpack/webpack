"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedConfig: true
	},
	resolve: {
		alias: {
			"@alias/never": path.resolve(__dirname, "real.js")
		}
	}
};
