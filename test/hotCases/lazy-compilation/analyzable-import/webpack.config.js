"use strict";

// The proxy a lazily-compiled `import()` is routed through loads the real chunk
// itself, so it bakes the analyzable form the same way the original import would.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true,
		lazyCompilation: { entries: false }
	},
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	node: { __dirname: false }
};
