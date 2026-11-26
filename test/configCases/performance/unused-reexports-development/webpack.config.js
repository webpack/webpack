"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "stats",
		unusedModules: true
	}
};
