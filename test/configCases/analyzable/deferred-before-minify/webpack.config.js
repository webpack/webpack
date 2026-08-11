"use strict";

// Terser and the source-map writer both read the asset, so a stand-in must already
// be gone: it is a different length than the name that replaces it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: "source-map",
	experiments: { outputModule: true },
	optimization: {
		chunkIds: "named",
		minimize: true,
		splitChunks: false,
		realContentHash: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		publicPath: "auto",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
