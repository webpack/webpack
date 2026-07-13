"use strict";

// HTML entry with a split runtime chunk: the extracted page should preload the
// entry's initial dependency chunks (here the runtime chunk) with a static
// `<link rel="preload" as="script">` in `<head>`, like Vite. A dynamic
// `import()` stays on webpack's on-demand runtime and is not statically hinted.
// `crossOriginLoading` + `html.integrity` also exercise the SRI/CORS attrs.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		crossOriginLoading: "anonymous",
		html: {
			integrity: true,
			resourceHints: true
		}
	},
	optimization: {
		chunkIds: "named",
		// Splits off a `runtime.js` initial sibling chunk to preload.
		runtimeChunk: "single"
	},
	experiments: {
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(path.resolve(__dirname, "test.js"));
							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
};
