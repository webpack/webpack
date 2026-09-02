"use strict";

// The runtime sits in `js/` while its hot update lands at the output root: the map a
// re-shipped runtime module holds is read from there, so its depth is spelled per asset.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "js/[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		cssChunkFilename: "[name].chunk.css",
		publicPath: "auto"
	}
};
