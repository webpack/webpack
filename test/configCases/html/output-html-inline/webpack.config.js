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
	}
];
