const path = require('path');

module.exports = {
    entry: './index',
    output: {
        webassemblyModuleFilename: "[base].wasm"
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
