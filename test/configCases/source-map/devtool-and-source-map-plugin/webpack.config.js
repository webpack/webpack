"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// 1. `devtool: 'hidden-source-map'` (no sourceMappingURL appended) +
	// a `SourceMapDevToolPlugin` that emits a second nosources map and appends
	// its URL.  This is the exact configuration sokra suggested in #6813.
	{
		devtool: "hidden-source-map",
		entry: "./primary.js",
		output: {
			filename: "primary.js"
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].secondary.map",
				noSources: true
			})
		]
	},
	// 2. `devtool: false` + two `SourceMapDevToolPlugin` instances writing to
	// different filenames for the same asset.
	{
		devtool: false,
		entry: "./dual.js",
		output: {
			filename: "dual.js"
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].full.map",
				append: false
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].nosources.map",
				noSources: true
			})
		]
	}
];
