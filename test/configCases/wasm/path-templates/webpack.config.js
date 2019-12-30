const path = require('path');

module.exports = {
    mode: "development",
    cache: false,
    entry: './index',
    output: {
        webassemblyModuleFilename: "[hash].wasm"
    },
    optimization: {
        chunkIds: "deterministic"
    },
    module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
    experiments: {
		asyncWebAssembly: true,
		importAwait: true
	}
};
