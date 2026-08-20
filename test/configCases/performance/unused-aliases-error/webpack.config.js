"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		unusedAliases: true
	},
	resolve: {
		alias: {
			"@alias/never": path.resolve(__dirname, "real.js")
		}
	}
};
