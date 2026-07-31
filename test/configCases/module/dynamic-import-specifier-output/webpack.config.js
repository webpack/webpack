"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	// splitChunks gives the chunks a dependency of their own, so the runtime
	// chunk-loading path is exercised as well as the import sites
	optimization: { splitChunks: { chunks: "all", minSize: 0 } },
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "bundle0.mjs",
		chunkFilename: "[name].chunk.mjs",
		publicPath: "auto"
	}
};
