"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "universal",
	devtool: "eval",
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	output: {
		module: true,
		filename: "entry/main.mjs",
		workerChunkFilename: "workers/nested/[id].mjs",
		webassemblyModuleFilename: "wasm/[hash].wasm",
		wasmStreamingFallback: true
	},
	experiments: { asyncWebAssembly: true, sourceImport: true }
};
