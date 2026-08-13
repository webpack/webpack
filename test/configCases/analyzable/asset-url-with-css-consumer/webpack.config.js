"use strict";

// A css consumer leaves an `asset-url` value built from a placeholder only css and
// html are rendered with, so the javascript literal comes from the name instead.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true, css: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.png$/, type: "asset/resource" }] }
};
