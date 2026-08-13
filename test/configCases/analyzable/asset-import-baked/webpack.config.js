"use strict";

// A default import needs the `module.exports = …` wrapper, which used to be the one
// asset shape that always read the runtime public path. Under `auto` the baked href
// spells the same string, so it can be a followable literal instead.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
};
