"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	}
};
