"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: {
		__dirname: false
	},
	output: {
		filename: "bundle.js",
		cssFilename: "[name].[contenthash].css",
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
	experiments: {
		css: true
	},
	optimization: {
		realContentHash: false
	}
};
