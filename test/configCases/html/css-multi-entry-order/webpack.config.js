"use strict";

// Two `<script src>` entries, each importing its own CSS. Each script's
// CSS must land before the *first* script, not just before its own tag —
// otherwise the second entry's `<link>` ends up after the first entry's
// `<script>` (CSS loading after a script that already ran).

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	experiments: { html: true, css: true },
	plugins: [
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
		}
	]
};
