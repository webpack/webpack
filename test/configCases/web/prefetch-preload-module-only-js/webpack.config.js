const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: {
		outputModule: true,
		css: true
	},
	name: "esm",
	target: "web",
	output: {
		publicPath: "",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		chunkFormat: "module",
		crossOriginLoading: "anonymous"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "Test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
						},
						assets => {
							if (
								assets["bundle0.mjs"]
									.source()
									.includes(`${RuntimeGlobals.preloadChunkHandlers}.s`)
							) {
								throw new Error(
									"Unexpected appearance of the 'modulepreload' preload runtime."
								);
							}

							if (
								assets["bundle0.mjs"]
									.source()
									.includes(`${RuntimeGlobals.prefetchChunkHandlers}.s`)
							) {
								throw new Error(
									"Unexpected appearance of the 'script' prefetch runtime."
								);
							}
						}
					);
				});
			}
		}
	],
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
