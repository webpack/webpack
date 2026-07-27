"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	module: {
		// "default-only" exports, so its fake namespace uses the other interop mode
		rules: [{ test: /\.txt$/, type: "asset/source" }]
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
