"use strict";

const fs = require("node:fs");
const path = require("node:path");
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

// Diamond `dependOn`: app -> [mid1, mid2] -> base. The page must load `base`
// once (before both mids) and the mids before `app`.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		base: "./src/base.js",
		mid1: { import: "./src/mid1.js", dependOn: "base" },
		mid2: { import: "./src/mid2.js", dependOn: "base" },
		app: { import: "./src/app.js", dependOn: ["mid1", "mid2"] }
	},
	output: { filename: "[name].js", html: true },
	optimization: { minimize: false },
	experiments: { html: true },
	plugins: [copyTest]
};
