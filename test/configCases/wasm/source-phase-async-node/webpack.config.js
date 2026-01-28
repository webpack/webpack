"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
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
			outputModule: true,
			asyncWebAssembly: true,
			sourceImport: true
		}
	},
	{
		target: "node",
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
			webassemblyModuleFilename: "[id].[hash].wasm"
		},
		experiments: {
			asyncWebAssembly: true,
			sourceImport: true
		}
	}
];
