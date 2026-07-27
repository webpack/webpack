"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	name: "many-chunks",
	mode: "production",
	entry: "./index",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			minSize: 0,
			chunks: "all",
			maxAsyncRequests: Infinity,
			maxInitialRequests: Infinity
		}
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkModules: true,
		chunkRelations: true,
		modules: false
	}
};
