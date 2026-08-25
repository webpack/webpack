"use strict";

// A `baseUri` naming a host but no scheme is not one anything can be resolved against
// here — but the runtime does not resolve it here either: it reads it against the
// chunk's own url, which is the very url the literal is resolved against. So it stays
// protocol-relative in the literal and settles the same way at load time.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: { bundle0: { import: "./index.js", baseUri: "//cdn.example/" } },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name][ext]",
		publicPath: "./"
	},
	optimization: { chunkIds: "named" }
};
