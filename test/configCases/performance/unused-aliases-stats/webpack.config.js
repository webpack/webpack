"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedAliases: true
	},
	resolve: {
		alias: {
			"@alias/never": path.resolve(__dirname, "real.js")
		}
	}
};
