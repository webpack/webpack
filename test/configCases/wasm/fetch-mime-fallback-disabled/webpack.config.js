"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
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
			chunkFilename: "chunks/[name].async.js",
			webassemblyModuleFilename: "[id].[hash].async.wasm",
			wasmStreamingFallback: false
		},
		experiments: {
			asyncWebAssembly: true
		}
	},
	{
		target: "web",
		module: {
			rules: [
				{
					test: /\.wat$/,
					loader: "wast-loader",
					type: "webassembly/sync"
				}
			]
		},
		output: {
			chunkFilename: "chunks/[name].sync.js",
			webassemblyModuleFilename: "[id].[hash].sync.wasm",
			wasmStreamingFallback: false
		},
		experiments: {
			syncWebAssembly: true
		}
	}
];
