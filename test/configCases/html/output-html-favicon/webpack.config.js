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

/** @type {(name, favicon) => import("../../../../").Configuration} */
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
	}
];
