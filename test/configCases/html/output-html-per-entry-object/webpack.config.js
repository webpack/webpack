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

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: { import: "./src/a.js", html: { favicon: false } },
		b: { import: "./src/b.js", html: { inject: "head" } },
		c: { import: "./src/c.js", html: { favicon: "./src/icon.svg" } },
		d: "./src/d.js"
	},
	output: {
		filename: "[name].js",
		html: { inject: "body" }
	},
	experiments: { html: true },
	plugins: [copyTest]
};
