"use strict";

const path = require("path");
const webpack = require("../../../");

/**
 * One analyzable-ESM build. `name` is both the output subdir and the label; `extra`
 * overrides entry/output/plugins to trigger a single analyzable-import limitation.
 * @param {string} name case name
 * @param {import("../../../").Configuration} extra per-case overrides
 * @returns {import("../../../").Configuration} configuration
 */
const base = (name, extra = {}) => ({
	name,
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	entry: extra.entry || "./index",
	plugins: extra.plugins,
	output: {
		module: true,
		path: path.resolve(
			__dirname,
			`../../js/stats/analyzable-esm-fallbacks/${name}`
		),
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto",
		...extra.output
	}
});

/** @type {import("../../../").Configuration[]} */
module.exports = [
	// Analyzable: emits `import("./async.mjs")` + the `.ei` helper.
	base("analyzable"),
	// Also analyzable: a chunk in several groups still dedupes through `.ei`'s
	// `installedChunks` bookkeeping, so sharing does not need the runtime form.
	base("shared-chunk", { entry: { a: "./a", b: "./b" } }),
	// Also analyzable: `.ei` runs every `ensureChunk` handler but the JS loader, so a
	// chunk's prefetch/preload children are still injected by `.f.prefetch`.
	base("prefetch", { entry: "./index-prefetch" }),
	// Also analyzable: an empty public path leaves a bare specifier, which is made
	// explicitly relative — the same thing the chunk loader does.
	base("bare-public-path", { output: { publicPath: "" } }),
	// Also analyzable: a native `import()` carries no `fetchPriority`, and the ESM chunk
	// loader ignores the argument, so the hint never forces the runtime form.
	base("fetch-priority", { entry: "./index-fetch-priority" }),
	// Also analyzable: the hot require wraps `.ei` the same way it wraps `.e`, so an
	// update still blocks on an in-flight chunk load.
	base("hmr", { plugins: [new webpack.HotModuleReplacementPlugin()] }),
	// Every case below must fall back with no `.ei` emitted.
	base("public-path-override", { entry: "./index-public-path-override" }),
	// The two hashed names below are deferrable in themselves; what stops them here is
	// `optimization.realContentHash`, off by default in development — without it the
	// rewritten chunk's own content hash would go stale.
	base("content-hash", {
		output: { chunkFilename: "[name].[contenthash].mjs" }
	}),
	base("templated-public-path", {
		output: { publicPath: "/assets/[fullhash]/" }
	})
];
