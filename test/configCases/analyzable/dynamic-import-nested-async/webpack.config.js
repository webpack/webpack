"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		publicPath: "auto",
		// Hashed chunk filenames are baked as post-hash placeholders.
		chunkFilename: "[name].[contenthash].mjs"
	}
};
