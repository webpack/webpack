"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: "source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "warning",
		sourceMaps: true
	}
};
