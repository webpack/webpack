"use strict";

// A public path carrying `[fullhash]` is settled no earlier than the hash it reads,
// so the asset's specifier reserves a stand-in the deferred pass fills in.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} hashPart the `[fullhash]` form under test
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, hashPart) => ({
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		library: { type: "module" },
		publicPath: `https://cdn.example.com/${hashPart}/`,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__SLICE__: JSON.stringify(hashPart.includes(":8") ? 8 : 0),
			__DIGEST__: JSON.stringify(hashPart.includes("base64safe"))
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "[fullhash]"),
	base(1, "[fullhash:8]"),
	// A digest no stand-in of ours could carry, so the whole template is handed over.
	base(2, "[fullhash:base64safe]")
];
