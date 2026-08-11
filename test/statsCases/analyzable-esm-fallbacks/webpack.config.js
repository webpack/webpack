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
/**
 * Names the given chunks by their own content, which `output` alone cannot do for
 * some chunks and not others.
 * @param {string[]} names chunk names to rename
 * @returns {import("../../../").WebpackPluginFunction} the plugin
 */
const nameConsumersByContent = (names) => (compiler) => {
	compiler.hooks.compilation.tap("NameConsumersByContent", (compilation) => {
		compilation.hooks.afterChunks.tap("NameConsumersByContent", (chunks) => {
			for (const chunk of chunks) {
				if (chunk.name !== null && names.includes(chunk.name)) {
					chunk.filenameTemplate = "[name].[contenthash].mjs";
				}
			}
		});
	});
};

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
	// Also analyzable: the public path's hash is filled in by the deferred pass, and
	// nothing here is named by its content, so rewriting a chunk invalidates no name.
	base("templated-public-path", {
		output: { publicPath: "/assets/[fullhash]/" }
	}),
	// Every case below must fall back with no `.ei` emitted.
	base("public-path-override", { entry: "./index-public-path-override" }),
	// Deferrable in itself; what stops it here is that the chunk the stand-in would be
	// written into is named by its own content while `optimization.realContentHash` is
	// off, as it is by default in development — so nothing repairs the name it is
	// rewritten under. That chunk is the entry, which is where the reference sits.
	base("content-hash", {
		output: {
			filename: "[name].[contenthash].mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	// Two depths need a stand-in, and the chunks it would land in are named by their
	// content — the referenced one is not, so the depth is what cannot be spelled.
	base("shared-depths", {
		entry: "./index-depths",
		plugins: [nameConsumersByContent(["flat", "nested/deep"])]
	})
];
