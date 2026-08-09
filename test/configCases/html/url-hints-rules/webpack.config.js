"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: ["web", "es2022"],
	entry: { page: "./page.html" },
	output: {
		filename: "[name].mjs",
		module: true,
		assetModuleFilename: "[name][ext]",
		resourceHints: {
			urlHints: [
				{ prefetch: true, fetchPriority: "low", as: "image" },
				{ test: /\.woff2$/, preload: true, as: "font", type: "font/woff2" },
				{
					include: /\/hero\//,
					preload: true,
					as: "image",
					media: "(min-width: 800px)"
				},
				{
					test: /\.png$/,
					exclude: /\/hero\//,
					prefetch: true,
					fetchPriority: "high"
				}
			]
		}
	},
	module: {
		rules: [
			{
				test: /\.(woff2|jpg|png|webmanifest|pdf|txt)$/,
				type: "asset/resource"
			}
		]
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true, outputModule: true },
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
