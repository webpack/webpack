const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node"],
	experiments: {
		outputModule: true
	},
	output: {
		module: true
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
								"a.js",
								new webpack.sources.RawSource(`module.exports = 1;`)
							);
						}
					);
				});
			}
		}
	]
};
