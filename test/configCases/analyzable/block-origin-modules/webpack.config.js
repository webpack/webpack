"use strict";

// `require.ensure`, an AMD `require([...])` and a lazy-once context all load a chunk
// through a block that names no module of its own — the module holding the block does.

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
