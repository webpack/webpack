"use strict";

// A `<head>` ending in a `<noscript>` (closed by its end tag, or closed early
// by content a head `<noscript>` cannot hold): the stylesheet added for the
// page's scripts goes after the `<noscript>`, linked or inlined.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */

/** @type {WebpackPluginInstance} */
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

/** @type {(name: string, page: string, inline: boolean) => Configuration} */
const config = (name, page, inline) => ({
	name: `${name}-${page}`,
	target: "web",
	entry: { [`${name}-${page}`]: `./src/${page}.html` },
	output: {
		filename: `${name}-${page}-[name].js`,
		cssFilename: `${name}-${page}-[name].css`,
		htmlFilename: `${name}-${page}.html`,
		html: { inline }
	},
	experiments: { html: true, css: true },
	optimization: { minimize: false },
	plugins: [copyTest]
});

/** @type {Configuration[]} */
module.exports = [
	config("linked", "closed", false),
	config("linked", "implied", false),
	config("inlined", "closed", true),
	config("inlined", "implied", true)
];
