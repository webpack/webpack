"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
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
		webassemblyModuleFilename: "[id].wasm"
	},
	experiments: {
		deferImport: true,
		asyncWebAssembly: true,
		outputModule: true
	}
};
