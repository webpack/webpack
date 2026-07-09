"use strict";

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

/** @typedef {boolean | string[] | ((asset: { filename: string }) => string[] | false)} Integrity */

/** @type {(name: string, integrity: Integrity) => import("../../../../").Configuration} */
const config = (name, integrity) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	// `[contenthash]` filenames exercise the late-resolution path: the SRI
	// hash must cover the bytes after `RealContentHashPlugin` rewrites them.
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: `${name}.html`,
		crossOriginLoading: "anonymous",
		html: { integrity }
	},
	experiments: { html: true, css: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("bool", true),
	config("array", ["sha256", "sha512"]),
	config("fn", (asset) =>
		asset.filename.endsWith(".css") ? false : ["sha384"]
	),
	// A separate runtime chunk means the entry script gets a cloned sibling
	// `<script>` — exercises integrity on cloned tags, not just the entry tag.
	{ ...config("split", true), optimization: { runtimeChunk: "single" } },
	// An authored `.html` entry whose native `<script>` already carries an
	// `integrity` attribute — the content-specific author value must be
	// replaced by the per-chunk one, not left beside it as a duplicate. A
	// single runtime chunk means that authored `<script>` is also cloned for
	// the runtime sibling, so both the rewritten entry tag and the cloned tag
	// are exercised.
	{
		name: "authored",
		target: "web",
		entry: { authored: "./src/authored.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "authored.html",
			crossOriginLoading: "anonymous",
			html: { integrity: true }
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// An authored `.html` with `preload`/`prefetch` resource hints: `preload`
	// links are integrity-eligible (SRI) and must get `crossorigin`/`integrity`
	// (including replacing an authored value), while `prefetch` gets neither.
	{
		name: "preload",
		target: "web",
		entry: { preload: "./src/preload.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "preload.html",
			crossOriginLoading: "anonymous",
			html: { integrity: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// A custom element mapped to a `script` source type synthesizes a fresh
	// `<script>` for its runtime sibling — exercises integrity on built (not
	// cloned) tags. The entry is an authored `.html`, so no wrapping happens.
	{
		name: "custom",
		target: "web",
		entry: { custom: "./src/page.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "custom.html",
			crossOriginLoading: "anonymous",
			html: { integrity: true }
		},
		module: {
			parser: {
				html: {
					sources: [
						"...",
						{ tag: "my-script", attribute: "src", type: "script" }
					]
				}
			}
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true },
		plugins: [copyTest]
	}
];
