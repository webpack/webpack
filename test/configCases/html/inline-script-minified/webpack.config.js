"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */

/** @type {WebpackPluginInstance} */
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

/** @type {Configuration} */
module.exports = {
	target: ["web", "es2020"],
	mode: "production",
	entry: { page: "./page.html" },
	output: {
		html: { inline: true }
	},
	optimization: {
		chunkIds: "named",
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		html: true
	},
	plugins: [copyTest]
};
