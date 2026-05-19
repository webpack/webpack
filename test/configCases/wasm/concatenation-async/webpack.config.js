"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		chunkIds: "named",
		moduleIds: "named"
	},
	output: {
		webassemblyModuleFilename: "[hash].wasm"
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
	experiments: {
		asyncWebAssembly: true
	}
};
