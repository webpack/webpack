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

/** @type {(name: string, inline: boolean | RegExp[]) => import("../../../../").Configuration} */
const config = (name, inline) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: `${name}.html`,
		html: { inline }
	},
	experiments: { html: true, css: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// inline: true — all chunks inlined, no <script src> or <link href>
	config("bool", true),
	// inline: RegExp[] — non-matching chunk name → served normally
	config("pattern", [/^nomatch$/]),
	// inline: RegExp[] matching the runtime chunk name — only runtime is inlined
	{
		...config("match", [/^runtime$/]),
		optimization: { runtimeChunk: "single" }
	},
	// runtime chunk inlined, entry chunk served normally
	{
		...config("split", true),
		optimization: { runtimeChunk: "single" }
	},
	// authored HTML with a <script src> entry — exercises the tag-replacement path
	{
		name: "authored",
		target: "web",
		entry: { authored: "./src/page.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "authored.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// <!-- webpackInline: true --> magic comment inlines just that tag
	// without setting output.html.inline at all
	{
		name: "magic",
		target: "web",
		entry: { magic: "./src/magic.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "magic.html"
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// magic comment with runtimeChunk: siblings must NOT be inlined (forceInline is entry-only)
	{
		name: "magic-split",
		target: "web",
		entry: { "magic-split": "./src/magic.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "magic-split.html"
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: false — explicit opt-out, chunks served normally
	config("no-inline", false),
	// inline: [] — empty array, no chunks match, served normally
	config("empty-pattern", []),
	// inline: true + integrity — inlined chunks must not emit an integrity attr
	{
		name: "inline-integrity",
		target: "web",
		entry: { "inline-integrity": "./src/main.js" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "inline-integrity.html",
			html: { inline: true, integrity: true },
			crossOriginLoading: "anonymous"
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true with authored CSS entry — <link> replaced with <style>
	{
		name: "css-link",
		target: "web",
		entry: { "css-link": "./src/style-entry.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "css-link.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	}
];
