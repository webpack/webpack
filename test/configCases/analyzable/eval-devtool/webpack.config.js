"use strict";

// A runtime module is emitted beside the eval-wrapped modules, never inside one, so
// the urls it writes out survive an `eval` devtool that module code cannot use.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {import("../../../../").Configuration["devtool"]} devtool the devtool under test
 * @param {import("../../../../").Configuration["experiments"]=} experiments extra experiments
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, devtool, experiments) => ({
	name,
	target: ["web", "node"],
	mode: "development",
	devtool,
	entry: { [name]: `./${name}-entry.js` },
	experiments: { css: true, ...experiments },
	optimization: { chunkIds: "named", minimize: false },
	module: { rules: [{ test: /\.(txt|png)$/, type: "asset/resource" }] },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: `${name}-[name].mjs`,
		cssChunkFilename: `${name}-[name].css`,
		assetModuleFilename: `${name}-[name][ext]`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "plain", false),
	base(1, "evaldev", "eval"),
	base(2, "evalmap", "eval-source-map"),
	// Only `futureDefaults` hands the per-asset-type spelling through as written
	// (webpack@5 collapses it to one string), so the module form has to read it.
	base(
		3,
		"evalarray",
		[
			{ type: "css", use: "source-map" },
			{ type: "javascript", use: "eval" }
		],
		{ futureDefaults: true }
	)
];
