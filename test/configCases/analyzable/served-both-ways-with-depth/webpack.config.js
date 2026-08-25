"use strict";

// The same module in an initial chunk the host fetched and in an async chunk the loader
// fetched through a public path that has a depth of its own — two urls one directory
// apart. Neither literal is right for both, so each asset gets its own: the one already
// under the public path names the file beside it, the one that is not puts it in front.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: { bundle0: "./index.js", side: "./side.js" },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "./assets/"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
