"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /\.txt$/,
				loader: require.resolve("./loader")
			},
			{
				test: /\.text$/,
				type: "asset/source"
			}
		]
	},
	experiments: {
		css: true
	}
};
