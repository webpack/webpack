"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: "./index.js",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].mjs",
		chunkFormat: "module"
	},
	externals: {
		"external-module-a": "module ./external-a.mjs",
		"external-module-b": "module ./external-b.mjs"
	},
	externalsType: "module",
	optimization: {
		concatenateModules: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(
					"copy-external-files",
					compilation => {
						compilation.hooks.processAssets.tap(
							{
								name: "copy-external-files",
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								// Read the external module files
								const externalA = fs.readFileSync(
									path.join(__dirname, "external-a.mjs"),
									"utf8"
								);
								const externalB = fs.readFileSync(
									path.join(__dirname, "external-b.mjs"),
									"utf8"
								);

								// Emit them as assets
								compilation.emitAsset(
									"external-a.mjs",
									new compiler.webpack.sources.RawSource(externalA)
								);
								compilation.emitAsset(
									"external-b.mjs",
									new compiler.webpack.sources.RawSource(externalB)
								);
							}
						);
					}
				);
			}
		}
	]
};
