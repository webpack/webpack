"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "filesystem"
	},
	optimization: {
		minimize: false
	},
	output: {
		publicPath: "",
		assetModuleFilename: "[name].[contenthash:8][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	}
};
