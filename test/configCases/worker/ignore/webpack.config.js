"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "worker-[name].mjs",
		environment: {
			nodePrefixForCoreModules: false
		}
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
								path.resolve(__dirname, "./worker.js")
							);

							compilation.emitAsset(
								"worker.mjs",
								new compiler.webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
};
