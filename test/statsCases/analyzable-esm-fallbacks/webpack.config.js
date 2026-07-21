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
	// Analyzable: emits `import("./async.mjs")` + the `.ei` helper — the only build
	// with extra runtime. Every case below must fall back with no `.ei` emitted.
	base("analyzable"),
	base("public-path-override", { entry: "./index-public-path-override" }),
	base("fetch-priority", { entry: "./index-fetch-priority" }),
	base("prefetch", { entry: "./index-prefetch" }),
	base("content-hash", {
		output: { chunkFilename: "[name].[contenthash].mjs" }
	}),
	base("templated-public-path", {
		output: { publicPath: "/assets/[fullhash]/" }
	}),
	base("bare-public-path", { output: { publicPath: "" } }),
	base("shared-chunk", { entry: { a: "./a", b: "./b" } }),
	base("hmr", { plugins: [new webpack.HotModuleReplacementPlugin()] })
];
