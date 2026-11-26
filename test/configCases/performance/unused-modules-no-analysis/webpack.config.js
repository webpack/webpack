"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		sideEffects: false
	},
	performance: {
		hints: "warning",
		unusedModules: true
	}
};
