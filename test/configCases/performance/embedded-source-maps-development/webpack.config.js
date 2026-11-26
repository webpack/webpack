"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: "inline-source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "warning",
		sourceMaps: true
	}
};
