/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		name: "node",
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
			webassemblyModuleFilename: "[id].[hash].wasm"
		},
		experiments: {
			outputModule: true,
			asyncWebAssembly: true
		}
	},
	{
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
			webassemblyModuleFilename: "[id].[hash].wasm"
		},
		experiments: {
			outputModule: true,
			asyncWebAssembly: true
		}
	}
];
