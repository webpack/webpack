"use strict";

// The stylesheet urls a runtime bakes survive HMR: an update that brings a new css
// chunk re-ships the runtime module, so the map is never asked for an id it lacks.

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
		cssChunkFilename: "[name].chunk.css"
	}
};
