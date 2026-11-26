"use strict";

/** @import { Configuration } from "../../../../" */

// A settled public path is inlined instead of read from the global, so the runtime
// module that would set it is not emitted at all.

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	// The bundle is only read back, never fetched — but the harness runs it on node.
	externalsType: "module",
	externals: { fs: "fs", path: "path" },
	devtool: false,
	module: {
		rules: [{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/sync" }]
	},
	experiments: { syncWebAssembly: true },
	optimization: { chunkIds: "named", splitChunks: false },
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "https://cdn.test/"
	}
};
