"use strict";

// `require.ensure` names no origin module for its block, so there is nothing a baked
// specifier could be relative to and the runtime form stays.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFormat: "module",
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
