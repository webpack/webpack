"use strict";

// `inline` decides the shape of a chunk's tag while the page's HTML is
// generated — once per HTML module, which can back several entries — so it can
// only be set on `output.html`; webpack warns instead of dropping it silently.

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

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: { import: "./src/a.js", html: { inline: true } }
	},
	output: { filename: "[name].js", html: true },
	experiments: { html: true },
	plugins: [copyTest]
};
