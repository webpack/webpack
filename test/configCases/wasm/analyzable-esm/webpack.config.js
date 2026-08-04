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
		// literal works and the public path expression is used instead.
		output: {
			chunkFilename: (pathData) =>
				pathData.chunk.name === "deep" ? "b-deep/[name].mjs" : "b-[name].mjs"
		},
		plugins: [
			expectations("b-flat.mjs", `new URL(${"__webpack_require__"}.p + "`)
		]
	}),
	base({
		// A non-`auto` public path keeps the runtime form: the node backends ignore
		// `output.publicPath`, so it can't be baked into a shared literal.
		output: { chunkFilename: "c-[name].mjs", publicPath: "./" },
		plugins: [expectations("c-flat.mjs", "module.id, ")]
	}),
	base({
		// Truncated `[hash:<n>]` on the runtime form: the helper slices the hash it is
		// handed rather than reading a baked literal.
		output: {
			chunkFilename: "d-[name].mjs",
			publicPath: "./",
			webassemblyModuleFilename: "[id].[hash:6].wasm"
		},
		plugins: [expectations("d-flat.mjs", "module.id, ")]
	})
];
