"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		filename: "[name].js",
		chunkFilename: "chunk-[name].js",
		workerChunkFilename: "worker-[name].js"
	},
	optimization: {
		chunkIds: "named",
		// share `./shared` as a single chunk between main and the worker
		splitChunks: {
			chunks: "async",
			minSize: 0
		}
	}
};
