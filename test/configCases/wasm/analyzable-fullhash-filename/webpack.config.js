"use strict";

// `[fullhash]` in a wasm filename is settled only after code generation, so the
// analyzable call site reserves a stand-in that the deferred pass fills in.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} baked whether the binary's url is expected to be a literal
 * @param {boolean} runs whether the binary can be loaded back
 * @param {string=} chunkSuffix what follows the chunk's name in its filename
 * @param {boolean=} realContentHash whether the deferred pass may run at all
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (
	index,
	name,
	hashPart,
	baked,
	runs,
	chunkSuffix = "",
	realContentHash = true
) => ({
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false, realContentHash },
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		wasmLoading: "async-node",
		chunkFilename: `${name}-chunks/[name]${chunkSuffix}.mjs`,
		webassemblyModuleFilename: `${name}.${hashPart}.[hash].module.wasm`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK_DIR__: JSON.stringify(`${name}-chunks`),
			__BAKED__: JSON.stringify(baked),
			__RUNS__: JSON.stringify(runs)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "plain", "[fullhash]", true, true),
	base(1, "sliced", "[fullhash:8]", true, true),
	// A digest re-encodes the hash rather than reading it, which no stand-in survives,
	// so the whole name is handed to the deferred pass and spelled by `getPath` there.
	base(2, "digest", "[fullhash:base64]", true, true),
	// Substituting rewrites the chunk after its own content hash was taken, and here
	// `RealContentHashPlugin` is not there to bring the two back in line. The chunk is
	// moved into the round that follows the compilation hash instead, so the name is
	// taken once that hash — the very thing being written into it — already exists.
	base(3, "no-repair", "[fullhash]", true, true, ".[contenthash]", false)
];
