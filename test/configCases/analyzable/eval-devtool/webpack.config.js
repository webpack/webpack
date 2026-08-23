"use strict";

// A runtime module is emitted beside the eval-wrapped modules, never inside one, so
// the urls it writes out survive an `eval` devtool that module code cannot use.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {string | false} devtool the devtool under test
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, devtool) => ({
	name,
	target: ["web", "node"],
	mode: "development",
	devtool,
	entry: { [name]: `./${name}-entry.js` },
	experiments: { outputModule: true, css: true },
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
	base(2, "evalmap", "eval-source-map")
];
