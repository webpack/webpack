"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		publicPath: "https://example.com/assets/",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
