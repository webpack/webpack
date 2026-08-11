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
 * @param {boolean} runs whether the harness can load the binary that way
 * @param {string} publicPath the relative public path under test
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, wasmLoading, wasmRef, runs, publicPath) => ({
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
		publicPath
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK__: JSON.stringify(`${name}-lazy.mjs`),
			__WASM_REF__: JSON.stringify(INSTANTIATE + wasmRef),
			__RUNS__: JSON.stringify(runs)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Not loaded: the harness cannot resolve an `import()` of a `/assets/` specifier.
	base(0, "node", "async-node", 'new URL("./', false, "/assets/"),
	// The public path reaches this one, and a relative one means something different
	// against the chunk than against the document, so the runtime form stays.
	base(1, "fetch", "fetch", "module.id, ", false, "/assets/"),
	// A chunk-relative public path resolves the same way the harness does, so this one
	// runs the binary the baked url points at.
	base(2, "run", "async-node", 'new URL("./', true, "./")
];
