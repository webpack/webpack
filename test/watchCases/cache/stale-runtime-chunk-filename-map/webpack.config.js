"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "webworker",
	cache: {
		type: "memory"
	},
	entry: {
		"service-worker": {
			import: "./service-worker.js",
			chunkLoading: "import-scripts",
			filename: "service-worker.js"
		},
		offscreen: "./offscreen.js"
	},
	output: {
		clean: false,
		filename: "[name].[contenthash].js",
		pathinfo: false
	},
	optimization: {
		realContentHash: false,
		sideEffects: false,
		splitChunks: {
			chunks: "all",
			minSize: 1,
			name: "js"
		}
	}
};
