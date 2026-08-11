"use strict";

// A source-phase import names its binary through `compileWasm` rather than through the
// instantiating loader, so that runtime module has to inline the re-encoded hash too.

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
	output: {
		webassemblyModuleFilename: "[id].[fullhash:base64safe].compile.wasm"
	},
	experiments: { asyncWebAssembly: true, sourceImport: true }
};
