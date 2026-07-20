"use strict";

// HTML entry with URL-referenced assets: hints emit into the extracted HTML
// `<head>` at build time (not from the JS runtime), so the browser fetches
// before any JS runs. Magic comments still win over `parser.<type>.urlHints`.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: ["web", "es2022"],
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		module: true,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		// The PNG is referenced via JS `new URL(...)`, so the rule lives on the
		// JS parser. (For the sibling HTML test, the rule would go under `html`.)
		parser: {
			javascript: {
				urlHints: [{ test: /\.png$/, prefetch: true, fetchPriority: "low" }]
			}
		}
	},
	// `stats.entrypoints[name].resourceHints` — Vite `ssrManifest` analogue.
	stats: { chunkGroupResourceHints: true },
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		outputModule: true
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
