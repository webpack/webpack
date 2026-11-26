"use strict";

/** @import { Configuration } from "../../../../" */

// Every rule matches, so the plugin must stay silent.
/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	module: {
		rules: [{ test: /\.js$/, use: [] }]
	}
};
