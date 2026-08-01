"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		publicPath: "/public/",
		assetModuleFilename: "[path][name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			},
			{
				test: /\.svg$/,
				type: "asset/resource",
				generator: {
					filename: "[file]"
				}
			}
		]
	}
};
