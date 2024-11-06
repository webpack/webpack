var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "es2020"],
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		iife: true
	},
	externals: {
		"external-module": "node-commonjs external-module",
		"external-other-module": ["node-commonjs external-module"]
	},
	optimization: {
		concatenateModules: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-webpack-plugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							compilation.emitAsset(
								"mod.js",
								new webpack.sources.RawSource(
									"module.exports = 'module text';\n"
								)
							);
						}
					);
					compilation.hooks.processAssets.tap(
						{
							name: "copy-webpack-plugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							compilation.emitAsset(
								"node_modules/external-module/index.js",
								new webpack.sources.RawSource(
									"module.exports = 'external module text';\n"
								)
							);
						}
					);
				});
			}
		}
	]
};
