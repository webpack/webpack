"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	name: "web",
	target: ["web", "node"],
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	output: {
		module: true,
		webassemblyModuleFilename: "[id].[hash].wasm"
	},
	experiments: {
		asyncWebAssembly: true,
		sourceImport: true
	}
};
