"use strict";

// A relative, hash-dependent public path can only be spelled once the hashes exist,
// and an entry `baseUri` replaces the output root it would otherwise resolve against.
// The stand-in carries both, so the deferred pass resolves the one against the other.

const webpack = require("../../../../");

const BASE = "https://example.com/base/";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: { main: { import: "./index.js", baseUri: BASE } },
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "[name].mjs",
		library: { type: "module" },
		publicPath: ({ hash }) => `${hash}/`,
		assetModuleFilename: "asset.txt"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: { realContentHash: true },
	plugins: [new webpack.DefinePlugin({ __BASE__: JSON.stringify(BASE) })]
};
