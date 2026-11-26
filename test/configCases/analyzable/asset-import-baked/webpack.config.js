"use strict";

/** @import { Configuration } from "../../../../" */

// A default import needs the wrapper, and under `auto` the baked href spells the
// same string the runtime public path would have.

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		filename: "bundle0.mjs",
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
};
