"use strict";

// Same as `wasm/fetch`, but `webassemblyModuleFilename` carries an explicit
// full-hash length (`[fullhash:16]`) so the fetch-based async and sync wasm
// runtime plugins request `getFullHash` — the regressed `[fullhash]` path.
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
					type: "webassembly/async"
				}
			]
		},
		output: {
			chunkFilename: "chunks/[name].async.js",
			webassemblyModuleFilename: "[id].[fullhash:16].async.wasm"
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
			module: true,
			chunkFilename: "chunks/[name].sync.mjs",
			webassemblyModuleFilename: "[id].[fullhash:16].module.sync.wasm"
		},
		experiments: {
			outputModule: true,
			syncWebAssembly: true
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
			webassemblyModuleFilename: "[id].[fullhash:16].sync.wasm"
		},
		experiments: {
			syncWebAssembly: true
		}
	}
];
