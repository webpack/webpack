"use strict";

const { SSRManifestPlugin, SourceMapDevToolPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	plugins: [
		// every chunk gets a map and the async one a second, so webpack records
		// `related.sourceMap` as a string for one asset and an array for the other
		new SourceMapDevToolPlugin({ filename: "[file].map" }),
		new SourceMapDevToolPlugin({
			filename: "[file].extra.map",
			test: /async\.js$/
		}),
		new SSRManifestPlugin()
	]
};
