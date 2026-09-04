"use strict";

// A hashed stylesheet name settles before the runtime chunk is hashed, so the map
// spells it and an update that moves the name re-ships the runtime module with it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		cssChunkFilename: "[name].[contenthash].css"
	}
};
