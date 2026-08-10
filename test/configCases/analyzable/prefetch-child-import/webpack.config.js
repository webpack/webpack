"use strict";

// A chunk with prefetch children stays analyzable: `.ei` runs every `ensureChunk`
// handler except the JS loader, so `.f.prefetch` still injects the `<link>`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		module: true,
		chunkFormat: "module",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named" },
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	performance: { hints: false }
};
