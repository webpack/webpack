module.exports = {
    entry: "./index",
    output: {
        webassemblyModuleFilename: "[fullhash].[hash].[hash:16].[base][ext].wasm"
    },
    optimization: {
        chunkIds: "deterministic"
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
		syncWebAssembly: true,
		importAwait: true
	}
};
