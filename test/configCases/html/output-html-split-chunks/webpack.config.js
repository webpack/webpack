"use strict";

const fs = require("node:fs");
const path = require("node:path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
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
};

// `runtimeChunk` + `splitChunks` produce extra initial chunks; the page must
// inject all of them (runtime, vendor, entry) in dependency order.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { app: "./src/app.js" },
	output: { filename: "[name].js", html: true },
	optimization: {
		minimize: false,
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				vendor: { test: /node_modules/, name: "vendor", enforce: true }
			}
		}
	},
	experiments: { html: true },
	plugins: [copyTest]
};
