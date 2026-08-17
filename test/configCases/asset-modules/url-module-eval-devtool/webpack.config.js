"use strict";

// An `eval` devtool disables the analyzable literal (`import.meta` is a syntax error
// inside `eval`), so the `new URL()` call site spells the runtime public path itself.
// Regression test: the wrapper-drop decision and the call site have to reach the same
// answer, or the call site requires a module that was never emitted.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: "eval",
	output: {
		filename: "[name].mjs",
		module: true,
		chunkFormat: "module",
		publicPath: "https://example.com/public/",
		assetModuleFilename: "[name][ext]"
	},
	experiments: {
		outputModule: true
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
