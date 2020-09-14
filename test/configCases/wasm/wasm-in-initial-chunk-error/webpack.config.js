/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index",
	output: {
		webassemblyModuleFilename: "[id].[hash:3].wasm"
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/sync"
			}
		]
	},
	experiments: {
		syncWebAssembly: true
	}
};
