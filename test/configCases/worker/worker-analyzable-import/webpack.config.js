"use strict";

// A worker whose `workerChunkLoading` is `import` uses the same ESM chunk loader as
// the main graph, so a dynamic import inside it stays analyzable.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	experiments: { outputModule: true }
};
