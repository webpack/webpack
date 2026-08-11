"use strict";

// Nothing reads the wrapper, so it is not emitted — and the two depths here cannot
// bake, so that reference concatenates what it would have said, inline.

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
