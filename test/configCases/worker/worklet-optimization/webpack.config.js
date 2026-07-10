"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	target: "web",
	optimization: {
		// split an initial chunk out of the worklet and give the build a shared
		// runtime chunk — a worklet can load neither, so the bootstrap must
		// pre-add every chunk.
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					enforce: true
				}
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worklet: true
				}
			}
		]
	}
};
