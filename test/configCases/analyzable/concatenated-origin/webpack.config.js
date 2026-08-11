"use strict";

// Concatenation replaces the module that wrote the reference, so the chunk graph no
// longer places that module — but the analyzable form still depends on where it lands.

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
	optimization: {
		chunkIds: "named",
		runtimeChunk: false,
		concatenateModules: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
