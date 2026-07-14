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
	},
	{
		name: "no-body",
		entry: { "no-body": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-no-body.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "bare-fragment",
		entry: { "bare-fragment": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-bare.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "comment-body",
		entry: { "comment-body": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-comment-body.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "module-output",
		entry: { "module-output": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			module: true,
			html: { template: "./src/template.html" }
		},
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	},
	{
		name: "with-css",
		entry: {
			"with-css": {
				import: ["./src/main.js", "./src/style.css"],
				html: true
			}
		},
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "bom",
		entry: { bom: { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: { template: "./src/template-bom.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "depend-on",
		entry: {
			shared: { import: ["./src/shared.js"] },
			"depend-on": {
				import: ["./src/main.js"],
				html: true,
				dependOn: ["shared"]
			}
		},
		output: {
			filename: "[name].js",
			html: { template: "./src/template.html" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "absolute-path",
		entry: { "absolute-path": { import: ["./src/main.js"], html: true } },
		output: {
			filename: "[name].js",
			html: {
				template: path.resolve(__dirname, "./src/template.html")
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	}
];
