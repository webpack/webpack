"use strict";

/** @import { Configuration } from "../../../../" */

// Told the modules are safe to drop, webpack leaves them out, so there is no
// cost left to report.
/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	module: {
		rules: [{ test: /\.js$/, sideEffects: false }]
	},
	performance: {
		hints: "stats",
		unusedModules: true
	}
};
