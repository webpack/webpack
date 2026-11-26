"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		splitChunks: false
	},
	performance: {
		hints: "warning",
		redundantDynamicImports: true
	}
};
