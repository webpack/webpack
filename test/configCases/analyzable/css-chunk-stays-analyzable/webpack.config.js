"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true,
		css: true
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	output: {
		module: true,
		publicPath: "auto",
		chunkFilename: "[name].mjs",
		cssChunkFilename: "[name].css"
	},
	// No warnings.js accompanies this case, so any bailout the build records for a
	// css-carrying chunk fails it.
	performance: {
		hints: "warning",
		analyzableBailouts: true
	}
};
