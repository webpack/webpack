"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("webpack").Configuration[]} */
module.exports = ["es2015", "es2020"].map((target) => ({
	mode: "production",
	target: ["web", target],
	entry: "./page.html",
	output: {
		filename: "script/[chunkhash].js",
		htmlFilename: "[name].html",
		cssFilename: "style/[name].css"
	},
	optimization: { minimize: false },
	experiments: { html: true, css: true },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap("Test", () => {
						compilation.emitAsset(
							"test.js",
							new compiler.webpack.sources.RawSource(
								fs.readFileSync(path.resolve(__dirname, "test.js"))
							)
						);
					});
				});
			}
		}
	]
}));
