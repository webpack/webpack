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
			webassemblyModuleFilename: "[id].[hash].module.async.wasm"
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
			webassemblyModuleFilename: "[id].[hash].async.wasm"
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
			chunkFilename: "chunks/[name].sync.mjs",
			webassemblyModuleFilename: "[id].[hash].module.sync.wasm"
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
			webassemblyModuleFilename: "[id].[hash].sync.wasm"
		},
		experiments: {
			syncWebAssembly: true
		}
	}
];
