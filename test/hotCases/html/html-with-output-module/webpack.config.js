"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		html: true
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
