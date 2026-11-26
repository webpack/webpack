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
			// '$' makes this exact-only, which turns the wildcard off entirely
			"@w/*$": path.resolve(__dirname, "leaf.js"),
			"@w/leaf": path.resolve(__dirname, "leaf.js")
		}
	}
};
