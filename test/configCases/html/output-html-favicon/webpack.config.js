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

/** @type {(name: string, favicon?: string | boolean) => import("../../../../").Configuration} */
const config = (name, favicon) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	output: {
		filename: "[name].js",
		htmlFilename: `${name}.html`,
		html: favicon === undefined ? true : { favicon }
	},
	experiments: { html: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// default — webpack logo svg favicon
	config("default", undefined),
	// disabled
	config("off", false),
	// user-provided icon
	config("custom", "./src/icon.svg"),
	// authored HTML entry — favicon injected into <head>
	{
		name: "authored",
		target: "web",
		entry: { authored: "./src/page.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "authored.html",
			html: true
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML entry — favicon disabled
	{
		name: "authored-off",
		target: "web",
		entry: { "authored-off": "./src/page-off.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "authored-off.html",
			html: { favicon: false }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML entry — custom favicon path
	{
		name: "authored-custom",
		target: "web",
		entry: { "authored-custom": "./src/page.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "authored-custom.html",
			html: { favicon: "./src/icon.svg" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// multi-page authored HTML — both pages get the favicon even if first one
	// already has <link rel="icon"> (exercises the pre-loop asset-name fix)
	{
		name: "authored-multi",
		target: "web",
		entry: {
			page1: "./src/page.html",
			page2: "./src/page-off.html"
		},
		output: {
			filename: "[name].js",
			html: true
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML already has <link rel='icon'> (single quotes) — must not double-inject
	{
		name: "has-icon-squote",
		target: "web",
		entry: { "has-icon-squote": "./src/page-has-icon-squote.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "has-icon-squote.html",
			html: true
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML already has <LINK REL="ICON"> (uppercase) — must not double-inject
	{
		name: "has-icon-upper",
		target: "web",
		entry: { "has-icon-upper": "./src/page-has-icon-upper.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "has-icon-upper.html",
			html: true
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML already has <link rel="shortcut icon"> — must not double-inject
	{
		name: "has-shortcut-icon",
		target: "web",
		entry: { "has-shortcut-icon": "./src/page-has-shortcut-icon.html" },
		output: {
			filename: "[name].js",
			htmlFilename: "has-shortcut-icon.html",
			html: true
		},
		experiments: { html: true },
		plugins: [copyTest]
	}
];
