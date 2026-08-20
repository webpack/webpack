"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedAliases: true
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
