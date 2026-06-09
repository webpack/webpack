"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: {
		main: "./index.js",
		// a second entry built as a worker, reusable from the main thread
		worker: { import: "./worker.js", worker: true }
	},
	output: {
		filename: "[name].js",
		chunkFilename: "chunk-[name].js",
		workerChunkFilename: "worker-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
