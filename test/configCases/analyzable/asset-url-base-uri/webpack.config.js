"use strict";

// `baseUri` replaces the output root an asset url resolves against, and only a public
// path that needs a base ever reaches it — hence the empty one here. The module is
// generated once, so only a base every entry agrees on can be settled into it.

const webpack = require("../../../../");

const BASE = "https://example.com/base/";

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} prefix keeping the emitted files of each config apart
 * @param {import("../../../../").Configuration["entry"]} entry the entries under test
 * @param {boolean} baked whether the url is expected to be a literal
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, prefix, entry, baked) => ({
	target: "node",
	mode: "development",
	devtool: false,
	entry,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: `${prefix}-[name].mjs`,
		library: { type: "module" },
		publicPath: "",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__PREFIX__: JSON.stringify(prefix),
			__BASE__: JSON.stringify(BASE),
			__BAKED__: JSON.stringify(baked)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "a", { main: { import: "./index.js", baseUri: BASE } }, true),
	// Two bases leave the module they share none to bake against.
	base(
		1,
		"b",
		{
			main: { import: "./index.js", baseUri: BASE },
			other: { import: "./other.js", baseUri: "https://other.example.com/" }
		},
		false
	),
	// An entry that sets none disagrees just the same: it resolves against the root.
	base(
		2,
		"c",
		{
			main: { import: "./index.js", baseUri: BASE },
			other: { import: "./other.js" }
		},
		false
	)
];
