"use strict";

// `csp`, `inline` and `integrity` are resolved once for the whole compilation,
// so an entry's `html` object can't override them — webpack warns instead of
// silently dropping them.

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
		a: {
			import: "./src/a.js",
			html: { csp: true, inline: true, integrity: true }
		}
	},
	output: {
		filename: "[name].js",
		crossOriginLoading: "anonymous",
		html: true
	},
	experiments: { html: true },
	plugins: [copyTest]
};
