"use strict";

// The entry sits in `js/` while its hot update lands at the output root: an updated
// module's baked `import()` is read from there, so its depth is spelled per asset.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "js/[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	}
};
