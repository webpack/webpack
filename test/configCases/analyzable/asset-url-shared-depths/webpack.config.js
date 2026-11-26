"use strict";

/** @import { Configuration } from "../../../../" */

// The module holding the `new URL` sits at two depths, so the specifier is reserved
// and each emitted asset gets its own `../` path once the names exist.

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
