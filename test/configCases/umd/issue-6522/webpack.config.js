"use strict";

// #6522: a UMD library targeting web+node must default globalObject to
// `globalThis` so it can be require()d by node, not only run where `self` exists.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "node"],
	// classic non-ESM UMD script (the original #6522 setup)
	experiments: { outputModule: false },
	// node built-ins external so the bundle can read its own emitted source
	externalsPresets: { node: true },
	node: { __dirname: false, __filename: false },
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].js",
		library: "MyLibrary",
		libraryTarget: "umd",
		chunkLoading: "jsonp",
		chunkFormat: "array-push"
	},
	optimization: {
		minimize: false,
		runtimeChunk: "single"
	}
};
