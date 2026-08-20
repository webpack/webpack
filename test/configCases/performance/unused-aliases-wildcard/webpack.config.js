"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedAliases: true
	},
	resolve: {
		alias: {
			"@wild/*": path.resolve(__dirname, "wild/*"),
			"@other/*": path.resolve(__dirname, "wild/*")
		}
	}
};
