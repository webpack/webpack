"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	resolve: {
		alias: {
			"@wild/*": path.resolve(__dirname, "wild/*"),
			"@other/*": path.resolve(__dirname, "wild/*")
		}
	}
};
