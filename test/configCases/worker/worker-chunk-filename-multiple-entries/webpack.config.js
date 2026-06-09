"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	output: {
		filename: "[name].js",
		workerChunkFilename: "worker-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
