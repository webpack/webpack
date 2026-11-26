"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning"
	},
	resolve: {
		alias: {
			"@alias/used": path.resolve(__dirname, "real.js"),
			"@alias/never": path.resolve(__dirname, "real.js")
		}
	}
};
