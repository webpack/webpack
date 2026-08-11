"use strict";

// `baseUri` replaces the output root the runtime resolves an asset url against. Only a
// public path that needs a base ever reaches it, hence the empty one here — and only
// one base every entry agrees on settles the url, since the module is generated once.

const webpack = require("../../../../");

const BASE = "https://example.com/base/";

/**
 * @param {string} filename the `output.filename` template
 * @param {string} read the emitted file `index.js` reads back
 * @param {import("../../../../").Configuration["entry"]} entry the entries under test
 * @param {boolean} baked whether the url is expected to be a literal
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (filename, read, entry, baked) => ({
	target: "node",
	mode: "development",
	devtool: false,
	entry,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename,
		library: { type: "module" },
		publicPath: "",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	plugins: [
		new webpack.DefinePlugin({
			__BUNDLE__: JSON.stringify(read),
			__BASE__: JSON.stringify(BASE),
			__BAKED__: JSON.stringify(baked)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(
		"bundle0.mjs",
		"bundle0.mjs",
		{ main: { import: "./index.js", baseUri: BASE } },
		true
	),
	// The shared module is generated once, so two bases leave it none to bake against.
	base(
		"[name].mjs",
		"main.mjs",
		{
			main: { import: "./index.js", baseUri: BASE },
			other: { import: "./other.js", baseUri: "https://other.example.com/" }
		},
		false
	)
];
