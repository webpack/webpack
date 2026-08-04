"use strict";

// A `webpackPrefetch` / `webpackPreload` hint must not force the runtime form: the
// `<link>` is emitted at chunk startup, independent of the `new URL(...)` call site,
// so the call site can still be the analyzable literal.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	output: {
		filename: "[name].mjs",
		module: true,
		chunkFormat: "module",
		publicPath: "https://example.com/public/",
		assetModuleFilename: "[name][ext]"
	},
	experiments: {
		outputModule: true
	},
	// `target: "web"` for the `<link>` injection; the assertions still read the
	// emitted bundle, so keep the node builtins external.
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	module: {
		rules: [
			{
				test: /\.(png|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
