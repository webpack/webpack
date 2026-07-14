"use strict";

// The same three pages built with Vite 8.1.4 to pin the shared invariants:
// CSS links always land in <head>; with only `defer`/module scripts they
// follow the script tags (Vite's script-then-CSS order — such scripts
// execute after parsing and after pending stylesheets); the entry tag's
// URL is rewritten in place; a page without written head/body gets no
// synthesized markup. Deliberate divergences: webpack keeps the author's
// tag where it was written (classic blocking scripts must not move; Vite
// relocates body scripts to <head> since its scripts are always deferred
// modules), and on head-less pages webpack keeps the CSS link next to
// (before) the entry tag instead of prepending to the document.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"test.js",
						new webpack.sources.RawSource(
							fs.readFileSync(path.resolve(__dirname, "test.js"))
						)
					);
				}
			);
		});
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "vite-body-script",
		target: "web",
		entry: { "vite-body-script": "./src/page-body.html" },
		output: { filename: "[name].mjs", module: true },
		experiments: { html: true, css: true, outputModule: true },
		plugins: [copyTest]
	},
	{
		name: "vite-head-script",
		target: "web",
		entry: { "vite-head-script": "./src/page-head.html" },
		output: { filename: "[name].mjs", module: true },
		experiments: { html: true, css: true, outputModule: true },
		plugins: [copyTest]
	},
	{
		name: "vite-bare-script",
		target: "web",
		entry: { "vite-bare-script": "./src/page-bare.html" },
		output: { filename: "[name].mjs", module: true },
		experiments: { html: true, css: true, outputModule: true },
		plugins: [copyTest]
	}
];
