"use strict";

// `output.module` with `environment.dynamicImport: false` used to pick the CommonJS
// wasm loader, emitting `require()` into an ES module — which the runtime refuses to
// load at all. ESM output must always take the `import()` branch.

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
		publicPath: "auto",
		environment: { module: true, dynamicImport: false }
	}
};
