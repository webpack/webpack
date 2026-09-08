"use strict";

const webpack = require("../../../../");

// Renaming an emitted chunk without rewriting what points at it is the shape the
// conformance walk exists to catch, so this case builds one on purpose.
class RenameLazyChunk {
	/**
	 * Applies this plugin to the compiler.
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RenameLazyChunk", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "RenameLazyChunk",
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				() => {
					if (compilation.getAsset("lazy.mjs")) {
						compilation.renameAsset("lazy.mjs", "renamed-by-plugin.mjs");
					}
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	},
	plugins: [new RenameLazyChunk()]
};
