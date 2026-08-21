"use strict";

// The hot path re-loads by whatever chunk id an update names, which a map written at
// build time cannot answer for, so a runtime carrying it keeps the runtime url form.

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
