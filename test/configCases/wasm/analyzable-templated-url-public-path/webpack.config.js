"use strict";

// A public path that is a complete URL stays absolute however it is spelled, so a
// `[fullhash]` in it — read plainly or re-encoded to another digest — bakes too.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {string} hashPart the `[fullhash]` form under test
 * @param {boolean} digest whether that form re-encodes the hash
 * @param {{ baked?: boolean, chunkSuffix?: string, workerChunkFilename?: string, realContentHash?: boolean, publicPath?: NonNullable<import("../../../../").Configuration["output"]>["publicPath"] }=} extra per-case overrides
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, hashPart, digest, extra = {}) => ({
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		realContentHash: extra.realContentHash !== false
	},
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		wasmLoading: "fetch",
		chunkFilename: `${name}-chunks/[name]${extra.chunkSuffix || ""}.mjs`,
		workerChunkFilename: extra.workerChunkFilename,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: extra.publicPath || `https://example.com/${hashPart}/`
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK_DIR__: JSON.stringify(`${name}-chunks`),
			__DIGEST__: JSON.stringify(digest),
			__HASH_FREE__: JSON.stringify(extra.publicPath !== undefined),
			__BAKED__: JSON.stringify(extra.baked !== false)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "plain", "[fullhash]", false),
	base(1, "sliced", "[fullhash:8]", false),
	base(2, "digest", "[fullhash:base64safe]", true),
	// A content-named template nothing is emitted under leaves nothing for the
	// deferred pass to invalidate, so the url still bakes.
	base(3, "unused-content-name", "[fullhash]", false, {
		realContentHash: false,
		workerChunkFilename: "[name].[contenthash].mjs"
	}),
	// The chunk the url is written into is named by its own content, and nothing repairs
	// that name after the deferred pass rewrites it. It is moved into the round that
	// follows the compilation hash instead, so its name is taken once the hash being
	// written into it exists — where a chunk reading `__webpack_require__.p` already is.
	base(4, "no-repair", "[fullhash]", false, {
		realContentHash: false,
		chunkSuffix: ".[contenthash]"
	}),
	// A function is called for its value, so one that answers with an absolute URL is
	// as bakeable as the same URL written out.
	base(5, "function", "[fullhash]", false, {
		publicPath: () => "https://example.com/fn/"
	})
];
