"use strict";

// A function `chunkFilename` may read any content hash the chunk carries, not only the
// javascript one — so the name is hash-dependent here and is left to the deferred pass.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		filename: "[name].mjs",
		chunkFilename: (pathData) =>
			`[name].${
				/** @type {Record<string, string>} */ (
					/** @type {import("../../../../").Chunk} */ (pathData.chunk)
						.contentHash
				).css
			}.mjs`,
		cssChunkFilename: "[name].css",
		module: true,
		chunkFormat: "module",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", realContentHash: true },
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	performance: { hints: false }
};
