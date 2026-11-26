"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	output: {
		publicPath: "",
		assetModuleFilename: "[name].[contenthash:8][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	optimization: { minimize: false }
};
