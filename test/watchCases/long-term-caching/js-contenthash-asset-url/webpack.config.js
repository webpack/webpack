"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: {
		__dirname: false
	},
	output: {
		filename: "[name].[contenthash].js",
		assetModuleFilename: "[name].[contenthash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	},
	optimization: {
		realContentHash: false
	}
};
