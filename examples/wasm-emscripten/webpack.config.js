"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		// `import source` for WebAssembly: compile (not instantiate) the module.
		asyncWebAssembly: true,
		sourceImport: true
	},
	optimization: {
		chunkIds: "deterministic" // keep filenames stable between modes
	}
};

module.exports = config;
