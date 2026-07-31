"use strict";

const fs = require("fs");
const path = require("path");
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

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "defer",
		entry: { defer: "./src/main.js" },
		output: { filename: "[name].js", html: { scriptLoading: "defer" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "blocking",
		entry: { blocking: "./src/main.js" },
		output: { filename: "[name].js", html: { scriptLoading: "blocking" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "emptyobj",
		entry: { emptyobj: "./src/main.js" },
		output: { filename: "[name].js", html: {} },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "module",
		entry: { module: "./src/main.js" },
		output: { html: true },
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	},
	{
		name: "module-warning",
		entry: { "module-warning": "./src/main.js" },
		output: { html: { scriptLoading: "blocking" } },
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	},
	{
		name: "entry-blocking",
		entry: {
			"entry-blocking": {
				import: "./src/main.js",
				html: { scriptLoading: "blocking" }
			}
		},
		output: { filename: "[name].js", html: { scriptLoading: "defer" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "module-entry-warning",
		entry: {
			"module-entry-warning": {
				import: "./src/main.js",
				html: { scriptLoading: "defer" }
			}
		},
		output: { html: true },
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	}
];
