"use strict";

// Source-phase wasm (`import source`) with an explicit full-hash length
// (`[fullhash:16]`) so the compile runtime module and the fetch/read-file
// compile plugins request `getFullHash` — the regressed `[fullhash]` path.
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
			module: true,
			chunkFilename: "chunks/[name].async.mjs",
			webassemblyModuleFilename: "[id].[fullhash:16].module.async.wasm"
		},
		experiments: {
			outputModule: true,
			asyncWebAssembly: true,
			sourceImport: true
		}
	},
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
			webassemblyModuleFilename: "[id].[fullhash:16].async.wasm"
		},
		experiments: {
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
			module: true,
			webassemblyModuleFilename: "[id].[fullhash:16].node.module.async.wasm"
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
			webassemblyModuleFilename: "[id].[fullhash:16].node.async.wasm"
		},
		experiments: {
			asyncWebAssembly: true,
			sourceImport: true
		}
	}
];
