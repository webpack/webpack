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
		dedupePrefetch: true
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
