"use strict";

/** @import { Configuration, WebpackPluginInstance } from "../../../../" */

// A public path ending in `@` and a chunk name starting `@webpack` only spell a
// reserved name together, which the fill pass must leave as written.

/** @type {WebpackPluginInstance} */
const servePrefixed = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "Test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				(assets) => {
					// where the public path has the chunk loaded from
					for (const name of Object.keys(assets)) {
						if (name.startsWith("@")) {
							compilation.renameAsset(name, `prefix@${name}`);
						}
					}
				}
			);
		});
	}
};

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	output: {
		module: true,
		publicPath: "./prefix@",
		chunkFilename: "[name].[contenthash].mjs"
	},
	optimization: { chunkIds: "named", minimize: false },
	plugins: [servePrefixed]
};
