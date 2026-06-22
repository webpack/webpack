"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	cache: {
		type: "memory",
		cacheUnaffected: true
	},
	output: {
		cssFilename: "[name].css",
		cssChunkFilename: "[name].css",
		assetModuleFilename: "assets/[name][ext]"
	},
	experiments: {
		css: true,
		cacheUnaffected: true,
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
