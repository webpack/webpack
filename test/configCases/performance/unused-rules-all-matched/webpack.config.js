"use strict";

// Every rule matches, so the plugin must stay silent.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedRules: true
	},
	module: {
		rules: [{ test: /\.js$/, use: [] }]
	}
};
