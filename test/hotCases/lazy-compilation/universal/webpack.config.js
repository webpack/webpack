"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	target: ["node", "web"],
	experiments: {
		outputModule: true,
		lazyCompilation: {
			entries: false
		}
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false
	}
};
