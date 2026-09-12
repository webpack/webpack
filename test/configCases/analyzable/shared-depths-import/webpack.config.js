"use strict";

// The module holding the `import()` sits at two depths. Only the loader names a
// chunk, so one specifier serves both rather than one `../` path per asset.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", splitChunks: false }
};
