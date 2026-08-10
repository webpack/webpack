"use strict";

// `__webpack_require__.p` belongs to a runtime, so an entry that reassigns it says
// nothing about an entry that does not.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		bundle0: "./index.js",
		overriding: "./overriding.js",
		plain: "./plain.js"
	},
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", runtimeChunk: false },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
