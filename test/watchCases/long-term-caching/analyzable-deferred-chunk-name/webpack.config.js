"use strict";

// A deferred chunk's name is baked into the parent that references it, so a rebuild
// that moves the child's hash has to re-bake the parent — and one that moves nothing
// must leave the parent's asset alone.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	entry: {
		bundle: "./index.js",
		side: "./side.js"
	},
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		moduleIds: "named",
		splitChunks: false,
		realContentHash: false
	}
};
