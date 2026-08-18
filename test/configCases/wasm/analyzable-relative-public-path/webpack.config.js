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
 * @param {string=} chunkDir directory the chunk is emitted under, so the path back to
 * the output root is more than the `./` a flat name gives
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (
	index,
	name,
	wasmLoading,
	wasmRef,
	runs,
	publicPath,
	chunkDir = ""
) => ({
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
		chunkFilename: `${chunkDir}${name}-[name].mjs`,
		webassemblyModuleFilename: `${name}-[id].wasm`,
		publicPath
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__CHUNK__: JSON.stringify(`${chunkDir}${name}-lazy.mjs`),
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
	// `fetch` reads a relative public path against the document, and the chunk holding
	// the reference was itself fetched through that path — so climbing out of the chunk
	// lands back on the document and the literal spells the same place.
	base(3, "relative", "fetch", 'new URL("./', false, "./"),
	// The same, with the chunk a directory down and the public path a directory deep:
	// the climb is what the `../` has to get right, which a flat `./` would hide.
	base(4, "deep", "fetch", 'new URL("../deep-', false, "dist/", "nested/")
];
