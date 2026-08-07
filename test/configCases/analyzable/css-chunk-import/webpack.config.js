"use strict";

// A chunk carrying CSS stays analyzable: the stylesheet is loaded by `.f.css`, which
// `.ei` dispatches alongside the literal `import()` of the JS half.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		cssChunkFilename: "[name].css",
		module: true,
		chunkFormat: "module",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named" },
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	performance: { hints: false }
};
