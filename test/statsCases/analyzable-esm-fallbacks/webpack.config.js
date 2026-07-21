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
	// Analyzable: emits `import("./async.mjs")` + the `.ei` helper. Every fallback
	// case below must emit no `.ei` at all.
	base("analyzable"),
	base("public-path-override", { entry: "./index-public-path-override" }),
	base("fetch-priority", { entry: "./index-fetch-priority" }),
	base("prefetch", { entry: "./index-prefetch" }),
	// A hashed chunk filename is baked as a post-hash placeholder and substituted at
	// render time, so these two are analyzable now.
	base("content-hash", {
		output: { chunkFilename: "[name].[contenthash].mjs" }
	}),
	base("templated-public-path", {
		output: { publicPath: "/assets/[fullhash]/" }
	}),
	// The consuming chunk's hash picks up the referenced chunk's hash, so a hashed entry
	// name (fullhash / chunkhash / contenthash — even without realContentHash) tracks the
	// embedded filename and stays cache-correct. All three are analyzable.
	base("entry-fullhash", {
		output: {
			filename: "[name].[fullhash].mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	base("entry-chunkhash", {
		output: {
			filename: "[name].[chunkhash].mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	base("entry-contenthash-no-rch", {
		output: {
			filename: "[name].[contenthash].mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	// A function filename can't be reasoned about for post-hash embedding.
	base("entry-filename-function", {
		output: {
			filename: () => "main.mjs",
			chunkFilename: "[name].[contenthash].mjs"
		}
	}),
	// The templated publicPath resolves, but its static prefix is bare — an
	// `import()` specifier would be treated as a package name.
	base("bare-templated-public-path", {
		output: { publicPath: "[fullhash]/" }
	}),
	base("bare-public-path", { output: { publicPath: "" } }),
	base("shared-chunk", { entry: { a: "./a", b: "./b" } }),
	base("hmr", { plugins: [new webpack.HotModuleReplacementPlugin()] })
];
