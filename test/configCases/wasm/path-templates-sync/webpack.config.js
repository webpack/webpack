const path = require('path');

module.exports = {
    entry: './index',
    output: {
        webassemblyModuleFilename: "[hash].[hash:16].[base][ext].wasm"
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
