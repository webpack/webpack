"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		asyncWebAssembly: true
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				wasm: {
					test: /wasm\.wat$/,
					name: "shared",
					chunks: "all",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
