"use strict";

/** @import { Configuration } from "../../../../" */

// A worker loading its own chunks through something other than `import` keeps that
// runtime, so a dynamic import inside it must not become the analyzable form.

/** @type {Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		workerChunkLoading: "async-node",
		publicPath: "auto"
	}
};
