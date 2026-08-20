"use strict";

// A runtime carrying the hot handler keeps the runtime url form: the hot path re-loads
// by whatever chunk id an update names, and a map written at build time knows only the
// stylesheets that existed then. What ships has no hot handler, and does bake.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	optimization: { chunkIds: "named", minimize: false },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		cssChunkFilename: "[name].css",
		publicPath: "auto"
	},
	node: { __dirname: false }
};
