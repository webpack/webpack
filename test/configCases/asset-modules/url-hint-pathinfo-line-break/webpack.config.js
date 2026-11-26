"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	output: {
		pathinfo: true,
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/"
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
