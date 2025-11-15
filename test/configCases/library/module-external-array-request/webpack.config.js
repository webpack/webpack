"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {webpack.Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	experiments: {
		outputModule: true
	},
	externals: {
		external: ["./external.mjs", "inner"]
	},
	externalsType: "module",
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-webpack-plugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(
								path.resolve(__dirname, "./external.mjs")
							);
							compilation.emitAsset(
								"external.mjs",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
};
