"use strict";

// Nothing reads the wrapper, so it is not emitted: the two depths here are named by
// their content, and the reference still bakes, repaired after the fill.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		realContentHash: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"NameConsumersByContent",
				(compilation) => {
					compilation.hooks.afterChunks.tap(
						"NameConsumersByContent",
						(chunks) => {
							for (const chunk of chunks) {
								const name = chunk.name;
								if (name === "flat" || name === "nested/deep") {
									chunk.filenameTemplate = "[name].[contenthash].mjs";
								}
							}
						}
					);
				}
			);
		}
	]
};
