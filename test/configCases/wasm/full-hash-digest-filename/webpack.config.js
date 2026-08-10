"use strict";

// A `[fullhash:<digest>]` in a wasm binary's name re-encodes the compilation hash, so
// the runtime cannot read it back from `getFullHash()` — the settled value is inlined
// into the loader instead.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} inlined whether the compilation hash is inlined into the loader
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, hashPart, inlined) => ({
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		wasmLoading: "async-node",
		chunkFilename: `${name}-chunks/[name].[contenthash].mjs`,
		webassemblyModuleFilename: `${name}.${hashPart}.[hash].module.wasm`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__PREFIX__: JSON.stringify(`${name}.`),
			__INLINED__: JSON.stringify(inlined)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "digest", "[fullhash:base64safe]", true),
	base(1, "digest-sliced", "[fullhash:base64safe:8]", true),
	// A plain read still goes through the runtime helper. Every config here names its
	// javascript by content, which keeps the analyzable form from baking the name and
	// leaves the runtime interpolation this case is about in place.
	base(2, "plain", "[fullhash]", false)
];
