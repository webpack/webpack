"use strict";

// `fetch` is the one loader a public path reaches; `readFile` resolves the binary's
// name against the chunk it is read from, exactly as a baked literal does.

const webpack = require("../../../../");

const INSTANTIATE = `${"__webpack_require__"}.v(exports, `;

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name prefix keeping the emitted files of each config apart
 * @param {NonNullable<import("../../../../").Configuration["output"]>["wasmLoading"]} wasmLoading how the binary is loaded
 * @param {string} wasmRef expected start of the binary's reference
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, wasmLoading, wasmRef) => ({
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
		chunkFilename: `${name}-[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: "/assets/"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK__: JSON.stringify(`${name}-lazy.mjs`),
			__WASM_REF__: JSON.stringify(INSTANTIATE + wasmRef)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, "node", "async-node", 'new URL("./'),
	// The public path reaches this one, and a relative one means something different
	// against the chunk than against the document, so the runtime form stays.
	base(1, "fetch", "fetch", "module.id, ")
];
