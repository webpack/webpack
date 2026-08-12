"use strict";

// Two depths need a stand-in, and with `realContentHash` off the chunks holding the
// reference are named by their content, so none may be written into them.

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
