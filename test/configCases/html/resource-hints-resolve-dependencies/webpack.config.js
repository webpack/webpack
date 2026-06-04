"use strict";

// Vite-style `resolveDependencies(deps, { hostType, entryName, compilation })`
// escape hatch: filter / rewrite the entrypoint's `<link>` descriptors before
// they land in `stats.entrypoints[name].resourceHints`. Common uses: swap
// URLs to a CDN, drop hints by route, add SSR-only entries.

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
		resourceHints: {
			resolveDependencies: (deps, { entryName, hostType }) => {
				// Rewrite every href through a "CDN" origin, drop the PNG,
				// and stamp the entry name onto a `data-entry` marker via
				// a synthetic descriptor (returned last).
				const kept = deps
					.filter((d) => d.href !== "image.png")
					.map((d) => ({ ...d, href: `https://cdn.example.com/${d.href}` }));
				kept.push({
					rel: "preload",
					href: `https://cdn.example.com/marker-${entryName}-${hostType}`,
					as: "fetch"
				});
				return kept;
			}
		}
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
