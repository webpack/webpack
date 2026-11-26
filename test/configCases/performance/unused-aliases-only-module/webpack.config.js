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
			// '$' makes this exact-only, so '@only/sub' below must not mark it used
			"@only$": path.resolve(__dirname, "real.js"),
			"@only/sub": path.resolve(__dirname, "sub.js")
		}
	}
};
