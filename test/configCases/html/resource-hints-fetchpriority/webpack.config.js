"use strict";

// `HtmlResourceHint.fetchPriority` — emitted on preload AND prefetch descriptors.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		page: "./page.html",
		second: "./second.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		resourceHints: [
			{
				rel: "preload",
				href: "/fonts/inter.woff2",
				as: "font",
				type: "font/woff2",
				fetchPriority: "high"
			},
			{ rel: "prefetch", entry: "second", fetchPriority: "low" }
		]
	},
	optimization: {
		chunkIds: "named",
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
