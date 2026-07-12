"use strict";

// HTML used directly as a compilation entry: `extract` defaults to `true` for
// entry HTML modules, so `page.html` is emitted as a `.html` file (the
// not-`"inline"` branch of HtmlModulesPlugin's render-manifest skip). The
// `<iframe srcdoc>` it contains is `extract: "inline"` — its asset is rewritten
// but it must NOT emit its own `.html`.

const fs = require("node:fs");
const path = require("node:path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "handled-[name][ext]"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				// The html entry's JS chunk only exports the HTML string, so provide
				// a free-standing test runner asset (loaded via test.config.js).
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
