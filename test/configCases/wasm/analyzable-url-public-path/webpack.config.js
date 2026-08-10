"use strict";

// A public path that is a complete URL bakes into the wasm literal, but only under
// `fetch` loading — `readFile` takes a `file:` URL alone, so it stays chunk-relative.

const webpack = require("../../../../");

const INSTANTIATE = `${"__webpack_require__"}.v(exports, `;
const COMPILE = `${"__webpack_require__"}.vs(`;

/**
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {NonNullable<import("../../../../").Configuration["output"]>["wasmLoading"]} wasmLoading how the binary is loaded
 * @param {string} wasmChunk chunk holding the wasm module under test
 * @param {string} wasmRef expected start of the baked url expression
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (name, wasmLoading, wasmChunk, wasmRef) => ({
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	experiments: {
		outputModule: true,
		asyncWebAssembly: true,
		sourceImport: true
	},
	output: {
		module: true,
		wasmLoading,
		chunkFilename: `${name}-chunks/[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: "https://example.com/assets/"
	},
	plugins: [
		new webpack.DefinePlugin({
			__WASM_CHUNK__: JSON.stringify(`${name}-chunks/${wasmChunk}.mjs`),
			__WASM_REF__: JSON.stringify(wasmRef)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(
		"fetch",
		"fetch",
		"lazy",
		`${INSTANTIATE}new URL("https://example.com/assets/fetch-`
	),
	base("node", "async-node", "lazy", `${INSTANTIATE}new URL("../node-`),
	// Source phase reaches the same url through `compileWasm` rather than `instantiateWasm`.
	base(
		"source",
		"fetch",
		"lazySource",
		`${COMPILE}new URL("https://example.com/assets/source-`
	)
];
