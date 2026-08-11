"use strict";

// Reserving a stand-in rewrites the asset it lands in after that asset's own content
// hash was taken, so with `realContentHash` off a chunk named by its content can hold
// none — and the two depths here need one, since no single `../` path reaches the
// chunk from both. Only the chunks holding the reference are named that way, so the
// referenced one is settled during code generation and the depth is what is missing.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
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
								if (chunk.name === "flat" || chunk.name === "nested/deep") {
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
