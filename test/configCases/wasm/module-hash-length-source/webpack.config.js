"use strict";

// Source-phase wasm with an explicit *module*-hash length (`[hash:6]`). A non-`auto`
// public path keeps the runtime form, so the compile runtime module slices the hash
// it is handed rather than reading a baked literal.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "async-node",
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	output: {
		module: true,
		publicPath: "./",
		chunkFilename: "chunks/[name].async.mjs",
		webassemblyModuleFilename: "[id].[hash:6].module.async.wasm"
	},
	experiments: {
		outputModule: true,
		asyncWebAssembly: true,
		sourceImport: true
	}
};
