"use strict";

// Async wasm under `output.module`: the binary URL is baked into the module call site
// (`__webpack_require__.v(exports, new URL("./x.wasm", import.meta.url))`) so it can be
// followed statically, instead of being assembled by the generic runtime helper.

const webpack = require("../../../../");

const INSTANTIATE = `${"__webpack_require__"}.v(exports, `;

/**
 * @param {string} chunkFile emitted file of the `flat` chunk
 * @param {string} wasmRef expected wasm reference in that chunk
 * @returns {import("../../../../").WebpackPluginInstance} define plugin
 */
const expectations = (chunkFile, wasmRef) =>
	new webpack.DefinePlugin({
		__WASM_CHUNK__: JSON.stringify(chunkFile),
		__WASM_REF__: JSON.stringify(INSTANTIATE + wasmRef)
	});

/**
 * Asserts from the build rather than from `index.js`, which is bundled — a needle
 * there would end up in the very output the size report reads.
 * @param {string} chunkFile emitted file to read
 * @param {string} needle what it has to contain
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertChunk = (chunkFile, needle) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				expect(String(assets[chunkFile].source())).toContain(needle);
			});
		});
	};

/**
 * @param {Partial<import("../../../../").Configuration>} config config
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (config) => ({
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
	...config,
	output: {
		module: true,
		webassemblyModuleFilename: "[id].[hash].wasm",
		...config.output
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base({
		// Every chunk holding the wasm module sits at the same depth, so a plain
		// relative literal works.
		output: { chunkFilename: "a-chunks/[name].mjs" },
		plugins: [expectations("a-chunks/flat.mjs", 'new URL("../')]
	}),
	base({
		// The wasm module is duplicated into chunks of different depths, so no single
		// literal works: the specifier is reserved and each chunk gets its own `../` path
		// once named, and the naming function is asked whether its answer moves.
		output: {
			chunkFilename: (pathData) =>
				pathData.chunk.name === "deep" ? "b-deep/[name].mjs" : "b-[name].mjs"
		},
		plugins: [
			expectations("b-flat.mjs", 'new URL("./'),
			// The same binary, one directory further down.
			assertChunk("b-deep/deep.mjs", 'new URL("../')
		]
	}),
	base({
		// A relative public path does not stop the node backends: they read the binary
		// relative to the chunk, which is what the baked literal addresses too.
		output: { chunkFilename: "c-[name].mjs", publicPath: "./" },
		plugins: [expectations("c-flat.mjs", 'new URL("./')]
	}),
	base({
		// Truncated `[hash:<n>]` is the module's own hash, which code generation already
		// knows, so it is baked rather than sliced by the runtime helper.
		output: {
			chunkFilename: "d-[name].mjs",
			publicPath: "./",
			webassemblyModuleFilename: "[id].[hash:6].wasm"
		},
		plugins: [expectations("d-flat.mjs", 'new URL("./')]
	})
];
