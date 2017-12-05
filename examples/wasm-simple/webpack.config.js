module.exports = {
	mode: "production",
	output: {
		webassemblyModuleFilename: "[modulehash].wasm",
		publicPath: "js/"
	},
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/experimental"
			}
		]
	}
};
