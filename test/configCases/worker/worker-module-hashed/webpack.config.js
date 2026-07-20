"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		publicPath: "auto",
		workerChunkFilename: "[name].[contenthash].mjs"
	},
	experiments: {
		outputModule: true
	}
};
