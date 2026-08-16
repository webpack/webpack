"use strict";

// Two entries of ONE compilation loading wasm differently, under a public path that is
// neither `auto` nor an absolute URL. `fetch` is the only loader such a path reaches,
// so it is the only one that has to keep the runtime form — the `readFile` entry
// resolves the binary against the chunk it is read from, exactly as a baked literal
// does, and must still bake one. Unless the two share a binary: it is generated once
// for both, so neither loader can be told the other's shape.

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
		[`${name}-web`]: { import: second, wasmLoading: "fetch" }
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
			__RUNTIME_FORM__: JSON.stringify(`${INSTANTIATE}module.id, `)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// A binary each: the runtimes are told apart, so only the fetching one bails.
	base(0, "split", "./web-entry.js", 'new URL("./'),
	// One binary between them: neither runtime can be answered on its own.
	base(1, "shared", "./shared-entry.js", "module.id, ")
];
