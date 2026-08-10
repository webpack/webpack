"use strict";

// Assigning `__webpack_public_path__` rules out the baked url, which is only known
// after parsing. The loader has to read that at the same time as the call site, or it
// skips the `import.meta.url` base while still being handed a relative path.

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
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		chunkFormat: "module",
		publicPath: "auto"
	}
};
