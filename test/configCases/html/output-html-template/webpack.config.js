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
	entry: { main: "./src/main.js" },
	output: { filename: "[name].js", html: true },
	experiments: { html: true },
	module: {
		parser: {
			html: {
				template: (content) => `<!doctype html><title>MyApp</title>${content}`
			}
		}
	},
	plugins: [copyTest]
};
