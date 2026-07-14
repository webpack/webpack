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
		name: "basic",
		entry: { basic: { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "inject-head",
		entry: { "inject-head": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html", inject: "head" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "inject-false",
		entry: { "inject-false": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html", inject: false }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "with-title",
		entry: { "with-title": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html", title: "Injected Title" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "no-head",
		entry: { "no-head": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-no-head.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "comment-tags",
		entry: { "comment-tags": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-comment.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "title-from-option",
		entry: { "title-from-option": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-no-title.html", title: "Option Title" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	}
];
