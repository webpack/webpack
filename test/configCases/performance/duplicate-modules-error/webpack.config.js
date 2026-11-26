"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	}
};
