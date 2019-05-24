module.exports = {
	// mode: "development || "production",
	output: {
		webassemblyModuleFilename: "[hash].wasm",
		publicPath: "js/"
	},
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async-experimental"
			}
		]
	},
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
