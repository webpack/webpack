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
			"@alias/used": path.resolve(__dirname, "real.js"),
			"@alias/never": path.resolve(__dirname, "real.js"),
			"@alias/also-never": path.resolve(__dirname, "real.js")
		}
	}
};
