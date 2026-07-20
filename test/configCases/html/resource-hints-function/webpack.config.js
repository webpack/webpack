"use strict";

// Custom `output.resourceHints` (function form): called per HTML page with its
// entrypoint context and the auto `defaultHints`, returning hints computed
// from the page name and referencing another entry by name.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		page: "./page.html",
		settings: "./settings.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		resourceHints: ({ entryName, hostType, defaultHints }) => {
			if (hostType !== "html") return defaultHints;
			// Spread the auto initial-graph preloads (`defaultHints`) and add
			// custom hints computed from the page context.
			if (!Array.isArray(defaultHints)) throw new Error("no defaultHints");
			return [
				...defaultHints,
				{ rel: "preload", href: `/hero-${entryName}.jpg`, as: "image" },
				{ rel: "prefetch", entry: "settings", as: "script" }
			];
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
