"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const EntryOptionPlugin = require("../../../../").EntryOptionPlugin;

// A third-party plugin can tap the entry hook to wrap a non-HTML entry in its
// own HTML, exactly as HtmlModulesPlugin does for `output.html` — here with a
// custom marker, without `output.html` being set.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: "./src/main.js" },
	output: {
		filename: "[name].js"
	},
	experiments: {
		html: true
	},
	plugins: [
		{
			apply(compiler) {
				EntryOptionPlugin.getHooks(compiler).entry.tap(
					"MarkdownLike",
					(context, name, desc) => {
						const imports = desc.import;
						if (!imports) return;
						const tags = imports
							.map((r) => `<script src="${r}"></script>`)
							.join("");
						return `data:text/html,<!doctype html><html><head></head><body><h1>From plugin</h1>${tags}</body></html>`;
					}
				);
			}
		},
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(path.resolve(__dirname, "test.js"));
							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
};
