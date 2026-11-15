"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "web", output: { module: false } },
	{ target: "web", output: { module: true } },
	{ target: "node", output: { module: false } },
	{ target: "node", output: { module: true } }
].map((options, index) => ({
	...options,
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		other: "./feature.js"
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: { asyncWebAssembly: true },
	output: {
		...options.output,
		filename: `[name].${index}.${options.output.module ? "mjs" : "js"}`,
		chunkFilename: `[name].${index}.${options.output.module ? "mjs" : "js"}`,
		webassemblyModuleFilename: `[id].${index}.[hash].wasm`
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /(shared\.js|\.wat)$/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
}));
