"use strict";

// JS-only entry (no HTML) — exercises the SSR flow: `output.resourceHints`
// builds auto initial-graph hints, `parser.javascript.urlHints` adds
// URL-asset defaults, and the user callback sees `hostType: "js"` because
// no HtmlEntryDependency points at this entry. The result is exposed at
// `stats.entrypoints[name].resourceHints` for the server to render.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		home: "./index.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		assetModuleFilename: "[name][ext]",
		publicPath: "https://cdn.example.com/",
		resourceHints: ({ entryName, hostType, defaultHints }) => {
			if (!Array.isArray(defaultHints)) throw new Error("no defaultHints");
			// Stamp a marker so the test can prove hostType === "js" here.
			return [
				...defaultHints,
				{
					rel: "preload",
					href: `https://cdn.example.com/marker-${entryName}-${hostType}`,
					as: "fetch"
				}
			];
		}
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
	module: {
		parser: {
			javascript: {
				urlHints: [
					{ test: /\.woff2$/, preload: true, as: "font", fetchPriority: "high" }
				]
			}
		},
		rules: [{ test: /\.(png|woff2)$/, type: "asset/resource" }]
	},
	stats: { chunkGroupResourceHints: true },
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
							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(
									fs.readFileSync(path.resolve(__dirname, "test.js"))
								)
							);
						}
					);
				});
			}
		}
	]
};
