"use strict";

// A chunk reachable from several groups stays analyzable: `.ei` dedupes on the same
// `installedChunks` map the runtime form uses, so a literal `import()` is equivalent.
// `one` is imported twice (two groups) and `vendor` is split out and shared by both.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor/,
					chunks: "all",
					name: "vendor",
					enforce: true
				}
			}
		}
	}
};
