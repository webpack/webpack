"use strict";

// The module holding `new Worker(new URL(...))` lives in chunks at two depths, so no
// one relative literal addresses the worker from both — each emitted asset gets its
// own, filled in once the names exist.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: { chunkIds: "named", splitChunks: false },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	experiments: { outputModule: true }
};
