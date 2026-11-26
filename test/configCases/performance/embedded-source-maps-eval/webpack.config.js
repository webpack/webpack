"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: "eval-source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "warning",
		sourceMaps: true
	}
};
