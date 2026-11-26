"use strict";

const { SSRManifestPlugin } = require("../../../../");

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
		cssChunkFilename: "[name].css",
		// keeps SSRManifestPlugin from warning about an "auto" public path
		publicPath: ""
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	},
	plugins: [new SSRManifestPlugin()]
};
