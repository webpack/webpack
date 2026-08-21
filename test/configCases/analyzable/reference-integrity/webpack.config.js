"use strict";

// Every kind of reference analyzable output writes out, in one build, so a name that
// stops resolving is caught wherever it regressed.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so the entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {string} chunkDirectory directory the chunks are emitted under
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, chunkDirectory) => ({
	name,
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	entry: { [name]: "./entry.js" },
	experiments: { outputModule: true, css: true, asyncWebAssembly: true },
	module: {
		rules: [
			{ test: /\.txt$/, type: "asset/resource" },
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", minimize: false },
	output: {
		module: true,
		filename: `${name}.mjs`,
		chunkFilename: `${chunkDirectory}${name}-[name].mjs`,
		cssChunkFilename: `${chunkDirectory}${name}-[name].css`,
		assetModuleFilename: `${chunkDirectory}${name}-[name][ext]`,
		webassemblyModuleFilename: `${chunkDirectory}${name}-[hash].wasm`,
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
	// Flat output: every name is settled during code generation.
	base(0, "flat", ""),
	// The entry itself one directory down, so every reference it carries has to climb
	// back to the output root first.
	{
		...base(1, "deep", ""),
		output: { ...base(1, "deep", "").output, filename: "deep/[name].mjs" }
	},
	// Hashed names are reserved during code generation and filled in once the hashes
	// exist, so this drives the deferred pass over every reference kind at once.
	{
		...base(2, "hashed", ""),
		output: {
			...base(2, "hashed", "").output,
			chunkFilename: "hashed-[name].[contenthash].mjs",
			cssChunkFilename: "hashed-[name].[contenthash].css",
			assetModuleFilename: "hashed-[name].[contenthash][ext]"
		}
	}
];
