"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: "inline-source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "error",
		sourceMaps: true
	}
};
