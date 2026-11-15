"use strict";

// The authored page is also bundled by `app` (a JS import) and `links` (a
// `<script src>`), whose chunks render it too; its own entry's options apply.

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
	target: "web",
	entry: {
		admin: {
			import: "./src/admin.html",
			html: { csp: true, integrity: true }
		},
		app: "./src/app.js",
		links: "./src/links.html"
	},
	output: {
		filename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	experiments: { html: true },
	plugins: [copyTest]
};
