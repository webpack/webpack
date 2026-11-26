"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		chunkFilename: "[name].js",
		cssChunkFilename: "[name].css"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
