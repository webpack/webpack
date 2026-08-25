"use strict";

// A `[fullhash:<digest>]` in a wasm binary's name re-encodes the compilation hash, so
// the runtime cannot read it back from `getFullHash()` — the settled value is inlined
// into the loader instead. Where the url bakes, no form of it is read back at all.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} inlined whether the compilation hash is inlined into the loader
 * @param {boolean=} overridePublicPath whether the entry reassigns the public path,
 * which keeps the name off the analyzable path and on the runtime one
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, hashPart, inlined, overridePublicPath = true) => ({
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
			__CHUNK_DIR__: JSON.stringify(`${name}-chunks`),
			__INLINED__: JSON.stringify(inlined),
			__OVERRIDDEN_PUBLIC_PATH__: JSON.stringify(overridePublicPath)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Left on the analyzable path, where the whole name is a literal in the chunk.
	base(0, "baked", "[fullhash:base64safe]", true, false),
	base(1, "digest", "[fullhash:base64safe:8]", true),
	// A plain read still goes through the runtime helper, which is the other half of
	// what a re-encoded digest cannot do.
	base(2, "plain", "[fullhash]", false)
];
