"use strict";

// `import.meta.glob` loads each match through the context module's own blocks, which
// name no module of their own — the context module holding them does.

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
