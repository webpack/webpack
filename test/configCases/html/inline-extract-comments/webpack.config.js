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

/** @type {(output: import("../../../../").Configuration["output"]) => import("../../../../").Configuration} */
const config = (output) => ({
	target: ["web", "es2020"],
	mode: "production",
	entry: { page: "./page.html" },
	output: { ...output, pathinfo: false, html: { inline: true } },
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The page sits beside its chunks and their license files.
	config({
		filename: "[name].js",
		cssFilename: "[name].css",
		htmlFilename: "page.html"
	}),
	// The page and its chunks sit in different directories, so a banner's path
	// is rewritten for where the page is.
	config({
		filename: "scripts/[name].js",
		cssFilename: "styles/[name].css",
		htmlFilename: "sub/page.html"
	}),
	// The same, with spaces in every path the banner names.
	config({
		filename: "my scripts/my [name].js",
		cssFilename: "my styles/my [name].css",
		htmlFilename: "my pages/page.html"
	})
];
