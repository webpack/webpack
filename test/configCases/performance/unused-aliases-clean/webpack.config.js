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
			"@alias/exact": path.resolve(__dirname, "exact.js"),
			"@alias/dir": path.resolve(__dirname, "dir")
		}
	}
};
