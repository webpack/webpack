"use strict";

// A css consumer drops the javascript wrapper and supplies an `asset-url` value built
// from a placeholder only css and html assets are rendered with. Reaching javascript
// it would never resolve, so the literal has to come from the name instead.

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
