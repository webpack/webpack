"use strict";

// `output.workerPublicPath` wins over the global one for a worker's chunks, and
// carries the same `[fullhash]` — resolved the same way.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named", realContentHash: true },
	experiments: { outputModule: true },
	output: {
		module: true,
		publicPath: "auto",
		workerPublicPath: "https://cdn.example.com/[fullhash]/",
		workerChunkFilename: "[name].mjs"
	}
};
