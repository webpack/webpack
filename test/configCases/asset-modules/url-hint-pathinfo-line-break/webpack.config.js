"use strict";

/** @type {import("../../../../").Configuration} */
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
