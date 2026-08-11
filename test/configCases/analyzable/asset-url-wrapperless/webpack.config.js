"use strict";

// Every javascript consumer of the asset is a `new URL()` that names it itself, so the
// `module.exports = .p + name` wrapper is read by no one and is not emitted. The two
// depths here cannot bake — the chunks they sit in are named by their own content —
// and that reference concatenates what the wrapper would have, inline.

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
