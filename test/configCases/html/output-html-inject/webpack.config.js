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
		name: "body",
		entry: { body: "./src/main.js" },
		output: { filename: "[name].js", html: { inject: "body" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "head",
		entry: { head: "./src/main.js" },
		output: { filename: "[name].js", html: { inject: "head" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "false",
		entry: { false: "./src/main.js" },
		output: { filename: "[name].js", html: { inject: false } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-false",
		entry: { "authored-false": "./src/page-false.html" },
		output: { filename: "[name].js", html: { inject: false } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-head",
		entry: { "authored-head": "./src/page-head.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// synthetic HTML + runtimeChunk + inject:"head": runtime must be before entry in <head>
	{
		name: "head-split",
		entry: { "head-split": "./src/main.js" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// runtimeChunk produces a sibling chunk — proves the headClose insertion path
	{
		name: "authored-head-split",
		entry: { "authored-head-split": "./src/page-head-split.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-false-split",
		entry: { "authored-false-split": "./src/page-false-split.html" },
		output: { filename: "[name].js", html: { inject: false } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// no </head> tag: inject:"head" must not crash, falls back to before the entry tag
	{
		name: "authored-nohead",
		entry: { "authored-nohead": "./src/page-nohead.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	}
];
