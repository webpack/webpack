"use strict";

// `defaultHints[].hostChunks` names the entrypoint chunk each hint originates
// from (Vite's `hostId`), so the callback can rewrite per referencing chunk.

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
		resourceHints: {
			initial: ({ defaultHints }) => {
				// Every hint must carry its origin chunk name(s).
				for (const d of defaultHints) {
					if (!Array.isArray(d.hostChunks) || d.hostChunks.length === 0) {
						throw new Error(`hint ${d.href} has no hostChunks`);
					}
				}
				// Rewrite only hints originating from the runtime chunk.
				return defaultHints.map((d) =>
					d.hostChunks.includes("runtime") ? { ...d, href: `${d.href}?rt` } : d
				);
			},
			manifest: "hints.json"
		}
	},
	optimization: { chunkIds: "named", runtimeChunk: "single" },
	module: {
		parser: {
			javascript: {
				urlHints: [{ test: /\.woff2$/, preload: true, as: "font" }]
			}
		},
		rules: [{ test: /\.woff2$/, type: "asset/resource" }]
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
