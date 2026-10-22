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
		name: "template",
		target: ["web", "es2022"],
		entry: { page: "./page.html" },
		output: { module: true, htmlFilename: "[name].html" },
		module: {
			parser: {
				// The placeholders name every chunk this page extracts, in place
				// of the default `<page>-<index>`.
				html: { chunkName: "[page]_[name]_[type]_[index]" }
			}
		},
		optimization: { chunkIds: "named" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "function",
		target: ["web", "es2022"],
		entry: { fn: "./fn.html" },
		output: { module: true, htmlFilename: "[name].html" },
		module: {
			parser: {
				html: {
					chunkName: ({ page, name, index, type }) =>
						`${page}.${name || "inline"}.${index}.${type}`
				}
			}
		},
		optimization: { chunkIds: "named" },
		experiments: { html: true },
		plugins: [copyTest]
	}
];
