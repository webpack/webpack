/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [
			{
				test: /\.wat$/,
				use: "wast-loader",
				type: "webassembly/sync"
			}
		]
	},
	experiments: {
		syncWebAssembly: true
	},
	optimization: {
		mangleWasmImports: true
	},
	output: {
		wasmImportObject: "ArrayBuffer"
	}
};
