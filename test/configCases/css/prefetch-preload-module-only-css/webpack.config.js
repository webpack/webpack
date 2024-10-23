const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");

function matchAll(pattern, haystack) {
	const regex = new RegExp(pattern, "g");
	const matches = [];

	let match;
	while ((match = regex.exec(haystack))) {
		matches.push(match);
	}

	return matches;
}

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
		crossOriginLoading: "anonymous",
		chunkFormat: "module"
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
							const source = assets["bundle0.mjs"].source();

							if (source.includes(`${RuntimeGlobals.preloadChunkHandlers}.j`)) {
								throw new Error(
									"Unexpected appearance of the 'modulepreload' preload runtime."
								);
							}

							if (
								source.includes(`${RuntimeGlobals.prefetchChunkHandlers}.j`)
							) {
								throw new Error(
									"Unexpected appearance of the 'script' prefetch runtime."
								);
							}

							if ([...matchAll(/chunk1-a-css/, source)].length !== 2) {
								throw new Error(
									"Unexpected extra code of the get chunk filename runtime."
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
