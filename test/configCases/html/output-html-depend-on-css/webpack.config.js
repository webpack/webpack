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

// The dependOn target (`shared`) pulls in CSS — the dependant page must inject
// that stylesheet too, before its own script.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		shared: "./src/shared.js",
		app: { import: "./src/app.js", dependOn: "shared" }
	},
	output: { filename: "[name].js", html: true },
	optimization: { minimize: false },
	experiments: { html: true, css: true },
	plugins: [copyTest]
};
