"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		uniqueName: "my-app",
		filename: "[uniqueName]-[uniquename]-[name].js",
		chunkFilename: "[uniquename].[name].chunk.js",
		assetModuleFilename: "[uniquename][ext]",
		publicPath: "/[uniquename]/"
	},
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/resource"
			}
		]
	}
};
