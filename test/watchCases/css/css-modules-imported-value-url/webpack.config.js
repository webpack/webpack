"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	cache: {
		type: "memory",
		cacheUnaffected: true
	},
	output: {
		filename: "bundle.js",
		cssFilename: "[name].css",
		assetModuleFilename: "[name].[contenthash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/resource"
			},
			{
				test: /\.module\.css$/,
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true,
		cacheUnaffected: true
	},
	node: {
		__dirname: false
	}
};
