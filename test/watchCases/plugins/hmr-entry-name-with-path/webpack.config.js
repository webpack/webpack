"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// The entry name carries a path and a literal `[name]` of its own.
	entry: { "[name]/entry.js": "./index.js" },
	output: {
		filename: "[name]",
		chunkFilename: "[name].js",
		hotUpdateChunkFilename: "static/webpack/[id].[fullhash].hot-update.js",
		hotUpdateMainFilename: "static/webpack/[fullhash].hot-update.json"
	},
	optimization: { chunkIds: "named" },
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
