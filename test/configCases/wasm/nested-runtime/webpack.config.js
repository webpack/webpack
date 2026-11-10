"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "universal", devtool: "eval", output: { module: true } },
	{ target: "node", devtool: "eval", output: { module: true } },
	{ target: "node", devtool: false, output: { module: false } },
	{ target: "web", devtool: "eval", output: { module: true } }
].map((options, index) => ({
	...options,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	output: {
		...options.output,
		filename: `nested/deep/main.${index}.${options.output.module ? "mjs" : "js"}`,
		webassemblyModuleFilename: "wasm/[hash].wasm",
		publicPath: options.target === "web" ? "https://test.cases/path/" : "auto"
	},
	experiments: { asyncWebAssembly: true, sourceImport: true }
}));
