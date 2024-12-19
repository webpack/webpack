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
	output: {
		wasmImportObject: "ArrayBuffer"
	}
};
