"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * @param {number} i config index
 * @param {Configuration} config overrides
 * @returns {Configuration} configuration
 */
const make = (i, config) => ({
	mode: "production",
	target: "node",
	devtool: "source-map",
	entry: { main: "./index.js" },
	node: {
		__dirname: false,
		__filename: false
	},
	...config,
	output: {
		filename: `cfg${i}/[name].[contenthash].js`,
		chunkFilename: `cfg${i}/[name].[contenthash].js`,
		...config.output
	},
	optimization: {
		chunkIds: "named",
		...config.optimization
	}
});

/** @type {Configuration[]} */
module.exports = [
	// Defaults: `realContentHash` rewrites every hash after the map is emitted.
	make(0, {}),
	make(1, { optimization: { minimize: false } }),
	make(2, {
		devtool: "hidden-source-map",
		optimization: { minimize: false }
	}),
	make(3, {
		devtool: "nosources-source-map",
		optimization: { minimize: false, realContentHash: false }
	}),
	// A hashed map name masks the asset's own hash in `file`.
	make(4, {
		output: { sourceMapFilename: "[file].[contenthash].map" },
		optimization: { minimize: false }
	}),
	make(5, {
		devtool: false,
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].map",
				debugIds: true
			})
		]
	}),
	make(6, {
		output: { hashFunction: "xxhash64", hashDigestLength: 8 }
	}),
	make(7, {
		target: "web",
		entry: { main: "./css.js" },
		output: {
			cssFilename: "cfg7/[name].[contenthash].css",
			cssChunkFilename: "cfg7/[name].[contenthash].css"
		},
		experiments: { css: true }
	})
];
