"use strict";

// A public path that is a complete URL bakes into the wasm binary's literal just as a
// chunk-relative one does — `new URL(...)` ignores its base for an absolute specifier.
// Only `fetch` loading may do that: `readFile` takes a `file:` URL alone, so a loader
// reading from disk keeps addressing the binary relative to its chunk.

const webpack = require("../../../../");

const INSTANTIATE = `${"__webpack_require__"}.v(exports, `;

/**
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {NonNullable<import("../../../../").Configuration["output"]>["wasmLoading"]} wasmLoading how the binary is loaded
 * @param {string} wasmRef expected start of the baked URL
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (name, wasmLoading, wasmRef) => ({
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
		wasmLoading,
		chunkFilename: `${name}-chunks/[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: "https://example.com/assets/"
	},
	plugins: [
		new webpack.DefinePlugin({
			__WASM_CHUNK__: JSON.stringify(`${name}-chunks/lazy.mjs`),
			__WASM_REF__: JSON.stringify(INSTANTIATE + wasmRef)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base("fetch", "fetch", 'new URL("https://example.com/assets/fetch-'),
	base("node", "async-node", 'new URL("../node-')
];
