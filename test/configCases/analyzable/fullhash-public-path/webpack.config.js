"use strict";

// `output.publicPath` names the compilation hash, which does not exist while the chunk
// holding the reference is hashed — and `[chunkhash]` is not repaired afterwards either.
// The chunk is moved into the round that follows that hash instead, which is where one
// reaching for `__webpack_require__.p` ends up on its own.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	experiments: { outputModule: true },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "bundle0.[chunkhash].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "/cdn/[fullhash]/"
	},
	optimization: { chunkIds: "named", realContentHash: false, minimize: false }
};
