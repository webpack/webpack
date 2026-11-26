"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: ["web", "node"],
	entry: "./index.js",
	output: {
		publicPath: "",
		module: true,
		assetModuleFilename: "[name][ext]",
		filename: "bundle0.mjs"
	}
};
