"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {webpack.Configuration} */
module.exports = {
	mode: "production",
	entry: { entry1: "./entry1.js", entry2: "./entry2.js" },
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].mjs"
	},
	experiments: {
		outputModule: true
	},
	externals: {
		external: "./external.mjs"
	},
	externalsType: "module",
	optimization: {
		concatenateModules: true,
		usedExports: true
	},
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
