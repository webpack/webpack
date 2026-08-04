"use strict";

// An `eval` devtool disables the analyzable literal (`import.meta` is a syntax error
// inside `eval`), so the `new URL()` call site keeps the runtime form and the asset's
// JS wrapper must be kept with it. Regression test: the wrapper-drop decision used to
// look only at `output.module` and dropped it here, leaving the call site requiring a
// module that no longer existed.

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
