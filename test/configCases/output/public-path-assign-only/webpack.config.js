"use strict";

// Assigning `__webpack_public_path__` writes the slot without reading the value the
// `publicPath` module computes, so that module ships only where something reads it back.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so the entry finds its own stats
 * @param {string} name output sub-directory
 * @param {string} entry entry module
 * @param {boolean} reads whether any module reads the public path back
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (index, name, entry, reads) => ({
	mode: "development",
	devtool: false,
	target: "node",
	entry,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", minimize: false },
	output: {
		module: true,
		chunkFormat: "module",
		filename: `${name}/main.mjs`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name),
			__READS__: JSON.stringify(reads)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Nothing reads it back, so auto-detection has no reader to serve.
	variant(0, "assign-only", "./assign.js", false),
	// Another module reads it, so the computed value has to be there first.
	variant(1, "read", "./read-entry.js", true)
];
