"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	output: {
		filename: "[name].js",
		chunkFilename: "chunk-[name].js",
		workerChunkFilename: "worker-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
