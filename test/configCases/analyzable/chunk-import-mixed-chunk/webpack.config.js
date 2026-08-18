"use strict";

// `splitChunks` can put one chunk in an initial group and an async one at once, and
// the two are served a public path apart. No literal in it can name either.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: { bundle0: "./index.js", other: "./other.js" },
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "c/[name].mjs",
		publicPath: "media/"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
