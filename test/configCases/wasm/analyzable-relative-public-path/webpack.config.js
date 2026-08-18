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
	// The public path reaches this one, and one rooted at the origin names the same
	// place from the chunk as from the document, so it is spelled out.
	base(1, "fetch", "fetch", 'new URL("/assets/', false, "/assets/"),
	// A chunk-relative public path resolves the same way the harness does, so this one
	// runs the binary the baked url points at.
	base(2, "run", "async-node", 'new URL("./', true, "./"),
	// `fetch` reads a relative public path against the document, which no literal
	// anchored at the chunk can spell, so this one keeps the runtime form.
	base(3, "relative", "fetch", "module.id, ", false, "./")
];
