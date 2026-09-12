"use strict";

// `runtimeChunk` puts one loader in front of both entrypoints, so the chunk `splitChunks`
// lifts out is one the first entry has at startup and the second asks the loader for.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		bundle0: "./index.js",
		other: "./other.js"
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
