"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	output: {
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
