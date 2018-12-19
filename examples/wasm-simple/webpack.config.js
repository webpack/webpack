module.exports = {
	// mode: "development || "production",
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
	},
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
