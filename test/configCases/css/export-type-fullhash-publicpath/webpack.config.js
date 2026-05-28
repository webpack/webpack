"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	mode: "development",
	output: {
		filename: "bundle0.js",
		cssFilename: "css/[name].css",
		cssChunkFilename: "css/[name].css",
		publicPath: "https://example.com/[fullhash]/",
		assetModuleFilename: "images/[name][ext]"
	},
	module: {
		rules: [
			{
				test: /text\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			},
			{
				test: /sheet\.css$/,
				type: "css/auto",
				parser: { exportType: "css-style-sheet" }
			},
			{
				test: /inject\.css$/,
				type: "css/auto",
				parser: { exportType: "style" }
			}
		]
	},
	experiments: { css: true }
};
