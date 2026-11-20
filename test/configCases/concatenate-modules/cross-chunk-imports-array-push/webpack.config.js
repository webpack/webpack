"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	output: {
		module: true,
		// ESM output whose chunks still load through the array-push format
		chunkFormat: "array-push",
		chunkLoading: "jsonp",
		filename: "bundle0.mjs",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports: true },
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /[\\/]shared[\\/]/,
					name: "shared",
					chunks: "async",
					minChunks: 2,
					minSize: 0,
					enforce: true
				}
			}
		}
	}
};
