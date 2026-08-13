"use strict";

// The public path only the deferred pass can spell resolves to text opening with the
// compilation hash, which reads as a scheme when it starts with a letter — so the base
// has to be applied after the fill, exactly as the runtime applies it.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		bundle0: { import: "./index.js", baseUri: "https://example.com/base/" }
	},
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		library: { type: "module" },
		publicPath: "x[fullhash]:8080/",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	optimization: { realContentHash: true }
};
