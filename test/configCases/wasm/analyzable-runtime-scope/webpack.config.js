"use strict";

// One runtime reassigns `__webpack_public_path__`, the wasm lives in another. The
// loader is emitted once per runtime and shared, so the call site must not bake a
// url the loader's own signature does not take.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: { main: "./index", other: "./override" },
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		wasmLoading: "async-node",
		filename: "[name].mjs",
		chunkFilename: "chunks/[name].mjs",
		publicPath: "auto"
	}
};
