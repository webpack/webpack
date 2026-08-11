"use strict";

// The binary is referenced from chunks at two depths, so no one relative literal
// addresses it from both — each emitted asset gets its own `../` path instead.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
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
		chunkFilename: "[name].mjs",
		webassemblyModuleFilename: "[id].wasm",
		publicPath: "auto"
	}
};
