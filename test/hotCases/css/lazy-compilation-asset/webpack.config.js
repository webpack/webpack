"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		cssFilename: "[name].css",
		cssChunkFilename: "[name].css",
		assetModuleFilename: "assets/[name][ext]"
	},
	experiments: {
		css: true,
		lazyCompilation: {
			entries: false,
			imports: true
		}
	},
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/resource"
			}
		]
	},
	node: {
		__dirname: false
	}
};
