"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	entry: "./index.mjs",
	experiments: {
		outputModule: true
	},
	output: {
		publicPath: "https://example.com/public/path/",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		resourceHints: {
			dedupe: true,
			initial: false
		}
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
