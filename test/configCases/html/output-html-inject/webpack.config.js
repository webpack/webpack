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
	// no head tags at all: inject:"head" anchors just inside the implicit
	// head (after `<html>`), hints too
	{
		name: "authored-nohead",
		entry: { "authored-nohead": "./src/page-nohead.html" },
		output: {
			filename: "[name].js",
			html: { inject: "head" },
			resourceHints: true
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// head exists only implicitly (`<title>` without written tags): siblings
	// anchor after its last child
	{
		name: "authored-implied-head",
		entry: { "authored-implied-head": "./src/page-implied-head.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// bare script, nothing else written: no usable head-open anchor, hints
	// fall back to the pre-script anchor
	{
		name: "authored-bare",
		entry: { "authored-bare": "./src/page-bare-script.html" },
		output: {
			filename: "[name].js",
			html: { inject: "head" },
			resourceHints: true
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "module-default-head",
		entry: { "module-default-head": { import: ["./src/main.js"], html: true } },
		output: { filename: "[name].js", module: true },
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	},
	// inject:false must not disable opt-in resource hints
	{
		name: "authored-false-hints",
		entry: { "authored-false-hints": "./src/page-false-hints.html" },
		output: {
			filename: "[name].js",
			html: { inject: false },
			resourceHints: true
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// two script entries in <head>, second imports CSS: the injected
	// stylesheet must still land before the first script
	{
		name: "authored-head-css",
		target: "web",
		entry: { "authored-head-css": "./src/page-head-css.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// synthetic HTML + inject:false: entry tag stays, runtime sibling is suppressed
	{
		name: "false-split",
		entry: { "false-split": "./src/main.js" },
		output: { filename: "[name].js", html: { inject: false } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// `</head>` inside a comment must not become the injection point
	{
		name: "authored-head-comment",
		entry: { "authored-head-comment": "./src/page-head-comment.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// body entry importing CSS, default inject: the stylesheet still goes to
	// <head> (html-webpack-plugin/Vite behavior), only scripts stay at the tag
	{
		name: "authored-body-css",
		target: "web",
		entry: { "authored-body-css": "./src/page-body-css.html" },
		output: { filename: "[name].js" },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// explicit inject:"body" beats the output.module "head" default
	{
		name: "module-inject-body",
		entry: {
			"module-inject-body": { import: ["./src/main.js"], html: true }
		},
		output: { filename: "[name].js", module: true, html: { inject: "body" } },
		experiments: { html: true, outputModule: true },
		plugins: [copyTest]
	},
	// stylesheet entry with a split CSS sibling: the sibling clones the
	// original <link> (so `media` carries over) at the head anchor
	{
		name: "authored-css-link-split",
		target: "web",
		entry: { "authored-css-link-split": "./src/page-css-link-split.html" },
		output: {
			filename: "[name].js",
			chunkFilename: "[name].chunk.js",
			html: { inject: "head" }
		},
		optimization: {
			chunkIds: "named",
			splitChunks: {
				cacheGroups: {
					shared: {
						test: /shared\.css$/,
						name: "shared-css",
						chunks: "all",
						enforce: true
					}
				}
			}
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// three split CSS chunks imported in anti-alphabetical order: the
	// injected links must follow the import order, not the chunk order
	{
		name: "authored-css-order",
		target: "web",
		entry: { "authored-css-order": "./src/page-css-order.html" },
		output: {
			filename: "[name].js",
			chunkFilename: "[name].chunk.js",
			html: { inject: "head" }
		},
		optimization: {
			chunkIds: "named",
			splitChunks: {
				cacheGroups: {
					cssA: {
						test: /css-a\.css$/,
						name: "css-a",
						chunks: "all",
						enforce: true
					},
					cssB: {
						test: /css-b\.css$/,
						name: "css-b",
						chunks: "all",
						enforce: true
					},
					cssC: {
						test: /css-c\.css$/,
						name: "css-c",
						chunks: "all",
						enforce: true
					}
				}
			}
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// defer script importing CSS followed by a classic blocking script:
	// the stylesheet may follow the defer tag but must stay ahead of the
	// blocking script
	{
		name: "authored-mixed-css",
		target: "web",
		entry: { "authored-mixed-css": "./src/page-mixed-css.html" },
		output: { filename: "[name].js" },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// defer entry in <body> + inject:head + runtimeChunk: the runtime
	// sibling and the stylesheet share the head anchor — script first
	// (Vite order for deferred scripts)
	{
		name: "authored-defer-split",
		target: "web",
		entry: { "authored-defer-split": "./src/page-defer-split.html" },
		output: { filename: "[name].js", html: { inject: "head" } },
		optimization: { runtimeChunk: "single" },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	}
];
