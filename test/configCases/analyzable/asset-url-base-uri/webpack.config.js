"use strict";

// `baseUri` replaces the output root an asset url resolves against, and only a public
// path that needs a base ever reaches it — hence the empty one here. The module is
// generated once per runtime, so entries that disagree each settle their own base.

const webpack = require("../../../../");

const BASE = "https://example.com/base/";
const OTHER = "https://other.example.com/";

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} prefix keeping the emitted files of each config apart
 * @param {import("../../../../").Configuration["entry"]} entry the entries under test
 * @param {Record<string, string | null>} bases the base each entry must bake, `null`
 * for one that resolves against the output root instead
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, prefix, entry, bases) => ({
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
			__BASES__: JSON.stringify(bases)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(
		0,
		"a",
		{ main: { import: "./index.js", baseUri: BASE } },
		{ main: BASE }
	),
	// Each runtime gets its own source, so two bases no longer block either one.
	base(
		1,
		"b",
		{
			main: { import: "./index.js", baseUri: BASE },
			other: { import: "./other.js", baseUri: OTHER }
		},
		{ main: BASE, other: OTHER }
	),
	// An entry that sets none resolves against the output root, which needs no base.
	base(
		2,
		"c",
		{
			main: { import: "./index.js", baseUri: BASE },
			other: { import: "./other.js" }
		},
		{ main: BASE, other: null }
	)
];
