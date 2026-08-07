"use strict";

// The analyzable `import()` is emitted under HMR too: the hot require wraps `.ei`
// exactly as it wraps `.e`, so an update still blocks on an in-flight chunk load.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	node: { __dirname: false }
};
