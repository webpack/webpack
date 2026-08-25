"use strict";

const path = require("path");

// The elements resolve relative to the directory the alias named, so the
// request as written survives only on the context dependency.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	resolve: {
		alias: {
			"@locales": path.resolve(__dirname, "locales")
		}
	}
};
