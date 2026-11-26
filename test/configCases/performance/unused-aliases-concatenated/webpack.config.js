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
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true
	},
	resolve: {
		alias: {
			"@alias/used": path.resolve(__dirname, "real.js")
		}
	}
};
