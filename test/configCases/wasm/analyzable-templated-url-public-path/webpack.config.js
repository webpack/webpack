"use strict";

// A public path that is a complete URL stays absolute however it is spelled, so a
// `[fullhash]` in it — read plainly or re-encoded to another digest — bakes too.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} digest whether that form re-encodes the hash
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, hashPart, digest) => ({
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
		wasmLoading: "fetch",
		chunkFilename: `${name}-chunks/[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: `https://example.com/${hashPart}/`
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK__: JSON.stringify(`${name}-chunks/lazy.mjs`),
			__DIGEST__: JSON.stringify(digest)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "plain", "[fullhash]", false),
	base(1, "sliced", "[fullhash:8]", false),
	base(2, "digest", "[fullhash:base64safe]", true)
];
