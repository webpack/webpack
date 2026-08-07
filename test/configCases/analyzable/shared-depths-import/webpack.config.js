"use strict";

// The module holding the `import()` lives in chunks at two depths, so no single
// relative literal addresses the target from both — and unlike `new URL(...)`, an
// `import()` specifier can't be a runtime concatenation. It keeps the runtime form.

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
