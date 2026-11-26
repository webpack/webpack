"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					HotModuleReplacementPlugin.getCompilationHooks(
						compilation
					).updateManifest.tap("Test", (manifest, { chunks }) => {
						manifest.custom = chunks.map((chunk) => chunk.id);
					});
				});
			}
		}
	]
};
