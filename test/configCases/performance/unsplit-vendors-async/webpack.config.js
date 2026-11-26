"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		unsplitVendors: true
	},
	optimization: { splitChunks: false }
};
