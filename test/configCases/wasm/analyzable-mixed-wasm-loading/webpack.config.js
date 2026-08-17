"use strict";

// Two entries loading wasm differently under a non-`auto` public path: only `fetch`
// keeps the runtime form, unless the two share a binary and neither can be told apart.

const webpack = require("../../../../");

const INSTANTIATE = `${"__webpack_require__"}.v(exports, `;

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {string} second the second entry, reaching a binary of its own or the `node` entry's
 * @param {string} nodeRef expected start of the binary's reference in the `node` entry
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, second, nodeRef) => ({
	name,
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		[`${name}-node`]: { import: "./node-entry.js", wasmLoading: "async-node" },
		[`${name}-web`]: { import: second, wasmLoading: "fetch" },
		// Shares no binary with either, so the sharing pair says nothing about it.
		[`${name}-alone`]: {
			import: "./alone-entry.js",
			wasmLoading: "async-node"
		}
	},
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" }
		]
	},
	optimization: { chunkIds: "named", splitChunks: false },
	experiments: { outputModule: true, asyncWebAssembly: true },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: `${name}-[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath: "./"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name),
			__NODE_REF__: JSON.stringify(INSTANTIATE + nodeRef),
			__BAKED__: JSON.stringify(`${INSTANTIATE}new URL("./`),
			__RUNTIME_FORM__: JSON.stringify(`${INSTANTIATE}module.id, `)
		})
	]
});

// Two entries reaching ONE async chunk, so its runtime is a set of keys -- the shape
// the group lookup answers key by key. Neither fetches, so no chunk cuts the scan.
/** @type {(index: number, name: string) => import("../../../../").Configuration} */
const multi = (index, name) => ({
	...base(index, name, "./web-entry.js", 'new URL("./'),
	entry: {
		[`${name}-a`]: { import: "./multi-a-entry.js", wasmLoading: "async-node" },
		[`${name}-b`]: { import: "./multi-b-entry.js", wasmLoading: "async-node" }
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// A binary each: the runtimes are told apart, so only the fetching one bails.
	base(0, "split", "./web-entry.js", 'new URL("./'),
	// One binary between them: neither runtime can be answered on its own.
	base(1, "shared", "./shared-entry.js", "module.id, "),
	multi(2, "multi")
];
