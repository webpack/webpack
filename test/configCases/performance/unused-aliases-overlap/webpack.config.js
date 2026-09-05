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
			// '@a' is declared first, so the resolver stops there and '@a/b' below
			// never applies to '@a/b/c'
			"@a": path.resolve(__dirname, "dirA"),
			"@a/b": path.resolve(__dirname, "dirB")
		}
	}
};
