"use strict";

// The module holding the `import()` lives in chunks at two depths, so no one relative
// literal addresses the target from both — the specifier is reserved instead and each
// emitted asset gets its own `../` path once the names exist.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
