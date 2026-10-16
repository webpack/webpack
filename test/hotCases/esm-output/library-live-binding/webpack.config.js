"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		library: { type: "module" }
	},
	optimization: {
		minimize: false
	}
};
