/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [
			{
				test: /\.wat$/,
				use: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		asyncWebAssembly: true
	},
	output: {
		wasmImportObject: "SharedArrayBuffer"
	}
};
