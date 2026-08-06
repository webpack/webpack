"use strict";

// `output.publicPath: ""` leaves the chunk specifier bare, which `import()` resolves
// as a package name. The ESM chunk loader has to make it explicitly relative.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		module: true,
		chunkFormat: "module",
		publicPath: ""
	},
	optimization: { chunkIds: "named" }
};
