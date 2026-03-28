"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	cache: { type: "memory" },
	entry: {
		a: "./a.js",
		b: "./b.js"
	},
	output: {
		filename: (pathData) =>
			pathData.chunk.name === "runtime"
				? "runtime.js"
				: "[name].[contenthash].js",
		chunkFilename: "[contenthash].js"
	},
	optimization: {
		runtimeChunk: "single",
		concatenateModules: false,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			minSizeReduction: 0
		}
	}
};
