"use strict";

const path = require("path");
const webpack = require("../../../");

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
				const chunkName = chunk.name;
				if (typeof chunkName === "string" && names.includes(chunkName)) {
					chunk.filenameTemplate = "[name].[contenthash].mjs";
				}
			}
		});
	});
};

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
	experiments: { outputModule: true },
	entry: extra.entry || "./index",
	plugins: extra.plugins,
	devtool: extra.devtool === undefined ? false : extra.devtool,
	module: extra.module,
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
	// Also analyzable: the entry the stand-in lands in is named by its own content and
	// `realContentHash` is off, so nothing repairs that name after the rewrite — the
	// name being baked is folded into the entry's hash before it is taken instead.
	base("content-hash", {
		output: {
			filename: "[name].[contenthash].mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	// Also analyzable: two depths need a per-asset stand-in for the `../` path, and the
	// chunks it lands in are named by their content — the depth is hash-independent, so
	// it reaches those names before they are taken.
	base("shared-depths", {
		entry: "./index-depths",
		plugins: [nameConsumersByContent(["flat", "nested/deep"])]
	}),
	// Every case below must fall back with no `.ei` emitted.
	base("public-path-override", { entry: "./index-public-path-override" }),
	// `import.meta` does not parse inside the `eval()` this devtool wraps a module in.
	base("eval-devtool", {
		entry: "./index-eval",
		devtool: "eval",
		module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
	}),
	// The worker runs its own chunk loader, which a native `import()` is not.
	base("worker-chunk-loading", {
		entry: "./index-worker",
		output: { workerChunkLoading: "async-node" }
	}),
	// Chunks are not read through a native `import()` at all under this format.
	base("chunk-format", { output: { chunkFormat: "array-push" } }),
	// The call site is whatever this names, which is not a native `import()`.
	base("import-function-name", {
		output: { importFunctionName: "__import__" }
	}),
	// Also analyzable: ESM output writes `import.meta` whatever `environment.module`
	// claims, so the url forms bake to match what the bundle already assumes.
	base("environment-module", {
		entry: "./index-asset",
		module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
		output: { environment: { module: false, dynamicImport: true } }
	}),
	// Two chunks naming each other: whichever hash settles first bakes into the other,
	// and the way back has no hash to read.
	base("circular", {
		entry: "./index-cycle",
		output: { chunkFilename: "[name].[contenthash].mjs" }
	}),
	// Also analyzable: a relative base is read against the chunk, so it is spelled in
	// the literal instead of being a base the url resolves against.
	base("base-uri", {
		entry: { main: { import: "./index-asset", baseUri: "not-a-url" } },
		module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
		output: { publicPath: "./" }
	})
];
