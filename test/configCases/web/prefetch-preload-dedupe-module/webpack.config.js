"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: {
		outputModule: true
	},
	name: "esm",
	target: "web",
	output: {
		publicPath: "https://example.com/public/path/",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		chunkFormat: "module",
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
