"use strict";

/** @import { Configuration } from "../../../../" */

// The module holding `new Worker(new URL(...))` sits at two depths, so each emitted
// asset gets its own relative literal once the names exist.

/** @type {Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named", splitChunks: false },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	}
};
