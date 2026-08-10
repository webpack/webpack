"use strict";

// The module holding `new Worker(new URL(...))` lives in chunks at two depths, so the
// specifier can't be one relative literal. The filename still gets to be a literal
// behind the runtime public path, instead of collapsing to a `.u(id)` lookup.

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
