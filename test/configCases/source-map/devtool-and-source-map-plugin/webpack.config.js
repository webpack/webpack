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
	},
	// 3. Three `SourceMapDevToolPlugin` instances on the same asset — exercises
	// the `related.sourceMap` array-merge path where the asset info already
	// has an array (rather than a single string) from the prior two plugins.
	{
		devtool: false,
		entry: "./triple.js",
		output: {
			filename: "triple.js"
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].a.map",
				append: false
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].b.map",
				append: false,
				noSources: true
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].c.map",
				sourceRoot: "triple"
			})
		]
	}
];
