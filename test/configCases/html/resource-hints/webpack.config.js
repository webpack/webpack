"use strict";

// Custom `output.resourceHints.chunks` (array form): literal hrefs (preconnect,
// font), an `entry` reference (expanded to its chunk URLs) and a `chunk`
// reference (resolved + de-duplicated against the auto initial-graph preload).

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
		crossOriginLoading: "anonymous",
		html: {
			integrity: true
		},
		resourceHints: {
			chunks: [
				{ rel: "preconnect", href: "https://cdn.example.com" },
				{
					rel: "preload",
					href: "/fonts/inter.woff2",
					as: "font",
					type: "font/woff2",
					crossorigin: true
				},
				{ rel: "prefetch", entry: "second" },
				{ rel: "preload", chunk: "runtime" },
				{ rel: "preload", chunk: "second", integrity: false },
				// Unresolvable/empty descriptors are silently dropped.
				{ rel: "preconnect" },
				{ rel: "preload", chunk: "does-not-exist" },
				{ rel: "prefetch", entry: "does-not-exist" },
				{ rel: "preload" }
			]
		}
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
