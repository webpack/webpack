"use strict";

// A sync binary is named by the chunk loader rather than by an async loader, so that
// runtime module has to inline the re-encoded hash too.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/sync" }]
	},
	output: {
		webassemblyModuleFilename: "[id].[fullhash:base64safe].sync.wasm"
	},
	experiments: { syncWebAssembly: true }
};
