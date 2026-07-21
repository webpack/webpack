"use strict";

// Vite-style filter/rewrite hook: `output.resourceHints: fn` receives the auto
// `defaultHints` for an entrypoint plus context (`entryName`, `entrypoint`,
// `hostType`, `compilation`) and returns the final descriptor list. This same
// callback applies both to the HTML `<head>` emission and to
// `stats.entrypoints[name].resourceHints`. Common uses: swap URLs to a CDN,
// drop hints by route, add SSR-only entries.

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
		assetModuleFilename: "[name][ext]",
		resourceHints: ({ entryName, hostType, defaultHints }) => [
			// Rewrite every href through a "CDN" origin, drop the PNG,
			// and stamp the entry name onto a `data-entry` marker via
			// a synthetic descriptor (returned last).
			...defaultHints
				.filter((d) => d.href !== "image.png")
				.map((d) => ({ ...d, href: `https://cdn.example.com/${d.href}` })),
			{
				rel: "preload",
				href: `https://cdn.example.com/marker-${entryName}-${hostType}`,
				as: "fetch"
			}
		]
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true, outputModule: true },
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
