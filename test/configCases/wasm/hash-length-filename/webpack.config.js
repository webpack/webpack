"use strict";

// `webassemblyModuleFilename` with an explicit full-hash length (`[fullhash:16]`)
// exercises the runtime `hashWithLength` branch of the wasm loaders, which
// previously emitted a stray `}` producing invalid runtime code.
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
			webassemblyModuleFilename: "[id].[fullhash:16].async.wasm"
		},
		experiments: {
			asyncWebAssembly: true
		}
	},
	{
		target: "node",
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
			webassemblyModuleFilename: "[id].[fullhash:16].sync.wasm"
		},
		experiments: {
			syncWebAssembly: true
		}
	}
];
