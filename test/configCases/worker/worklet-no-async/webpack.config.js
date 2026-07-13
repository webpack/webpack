"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		// no async/arrow support -> the bootstrap must fall back to a Promise chain
		// and plain function expressions instead of `async`/`await` and arrows.
		environment: { asyncFunction: false, arrowFunction: false }
	},
	target: "web",
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				vendor: { test: /vendor\.js$/, name: "vendor", enforce: true }
			}
		}
	},
	module: {
		rules: [{ test: /\.[cm]?js$/, parser: { worklet: true } }]
	}
};
