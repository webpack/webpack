"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "umd" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
