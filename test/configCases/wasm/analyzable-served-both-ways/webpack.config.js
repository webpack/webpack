"use strict";

// One wasm module in a chunk the host fetched and in one the loader fetched through a
// base-needing public path — each asset gets its own literal, so the pair still bakes.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", a: "./a.js", b: "./b.js" },
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		wasmLoading: "fetch",
		filename: "[name].mjs",
		chunkFilename: "chunks/[name].mjs",
		publicPath: "./assets/"
	}
};
