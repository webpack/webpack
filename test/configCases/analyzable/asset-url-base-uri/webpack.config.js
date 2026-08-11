"use strict";

// `baseUri` replaces the output root the runtime resolves an asset url against, and a
// literal read from its own chunk cannot share that base — so the runtime form stays.
// Only a public path that needs a base reaches it, hence the empty one here.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		main: { import: "./index.js", baseUri: "https://example.com/base/" }
	},
	experiments: { outputModule: true },
	output: {
		module: true,
		library: { type: "module" },
		publicPath: "",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	}
};
