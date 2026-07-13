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

/** @type {(name: string, inline: boolean | RegExp[]) => import("../../../../").Configuration} */
const config = (name, inline) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	output: {
		filename: "[name].[contenthash].js",
		htmlFilename: `${name}.html`,
		html: { inline }
	},
	experiments: { html: true, css: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// inline: true — all chunks inlined, no <script src> or <link href>
	config("bool", true),
	// inline: RegExp[] — non-matching chunk name → served normally
	config("pattern", [/^nomatch$/]),
	// inline: RegExp[] matching the runtime chunk name — only runtime is inlined
	{
		...config("match", [/^runtime$/]),
		optimization: { runtimeChunk: "single" }
	},
	// runtime chunk inlined, entry chunk served normally
	{
		...config("split", true),
		optimization: { runtimeChunk: "single" }
	},
	// authored HTML with a <script src> entry — exercises the tag-replacement path
	{
		name: "authored",
		target: "web",
		entry: { authored: "./src/page.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "authored.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// <!-- webpackInline: true --> magic comment inlines just that tag
	// without setting output.html.inline at all
	{
		name: "magic",
		target: "web",
		entry: { magic: "./src/magic.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "magic.html"
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// a malformed magic comment between `<!-- webpackInline: true -->` and the
	// script must clear the pending inline, so the script is served normally
	{
		name: "magic-inline-reset",
		target: "web",
		entry: { "magic-inline-reset": "./src/magic-inline-reset.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "magic-inline-reset.html"
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// magic comment with runtimeChunk: forceInline applies to the whole entry, so
	// the runtime sibling is inlined alongside the entry chunk
	{
		name: "magic-split",
		target: "web",
		entry: { "magic-split": "./src/magic.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "magic-split.html"
		},
		optimization: { runtimeChunk: "single" },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: false — explicit opt-out, chunks served normally
	config("no-inline", false),
	// inline: [] — empty array, no chunks match, served normally
	config("empty-pattern", []),
	// inline: true + integrity — inlined chunks must not emit an integrity attr
	{
		name: "inline-integrity",
		target: "web",
		entry: { "inline-integrity": "./src/main.js" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "inline-integrity.html",
			html: { inline: true, integrity: true },
			crossOriginLoading: "anonymous"
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// JS importing an HTML module — sentinel must not appear in the JS chunk
	{
		name: "js-imports-html",
		target: "web",
		entry: { "js-imports-html": "./src/main-with-html.js" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "js-imports-html-wrapper.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true with authored CSS entry — <link> replaced with <style>
	{
		name: "css-link",
		target: "web",
		entry: { "css-link": "./src/style-entry.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "css-link.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true — a chunk containing `</script>`/`</style>` must not close the
	// wrapping inline element early (development mode keeps the literal raw)
	{
		name: "escape",
		mode: "development",
		target: "web",
		entry: { escape: "./src/tricky.js" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "escape.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true with a module-script entry — the inlined tag must stay
	// `<script type="module">`, not collapse to a classic script
	{
		name: "module",
		target: "web",
		entry: { module: "./src/page-module.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "module.html",
			module: true,
			html: { inline: true }
		},
		experiments: { html: true, css: true, outputModule: true },
		plugins: [copyTest]
	},
	// authored `<script type="module">` but classic-IIFE output — the inlined
	// tag must be a plain `<script>`, not `type="module"`
	{
		name: "module-classic",
		target: "web",
		entry: { "module-classic": "./src/page-module.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "module-classic.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true with CSS emitted to a subdirectory — relative `url(...)` must be
	// rebased to the HTML's location, and the now-inlined .css file dropped
	{
		name: "css-rebase",
		mode: "development",
		target: "web",
		entry: { "css-rebase": "./src/main-css-url.js" },
		output: {
			filename: "[name].[contenthash].js",
			cssFilename: "styles/[name].[contenthash].css",
			assetModuleFilename: "assets/[hash][ext]",
			htmlFilename: "css-rebase.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline a named split chunk — its now-unreferenced standalone file is deleted
	{
		name: "delcheck",
		target: "web",
		entry: { delcheck: "./src/main.js" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "delcheck.html",
			html: { inline: [/^delcheck-runtime$/] }
		},
		optimization: { runtimeChunk: { name: "delcheck-runtime" } },
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// inline: true with a `<link rel="modulepreload">` entry — a fetch hint (and a
	// void element) must not be inlined into an unclosed, executing `<script>`
	{
		name: "modulepreload",
		target: "web",
		entry: { modulepreload: "./src/modulepreload.html" },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "modulepreload.html",
			module: true,
			html: { inline: true }
		},
		experiments: { html: true, css: true, outputModule: true },
		plugins: [copyTest]
	},
	// css at the output root, HTML in a subdirectory — root-relative `url(...)`
	// must gain the `../` back-out for the page's location
	{
		name: "css-rebase-sub",
		mode: "development",
		target: "web",
		entry: { "css-rebase-sub": "./src/main-css-url.js" },
		output: {
			filename: "[name].[contenthash].js",
			cssFilename: "[name].[contenthash].css",
			assetModuleFilename: "assets/[hash][ext]",
			htmlFilename: "sub/css-rebase-sub.html",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// absolute `output.publicPath` — CSS urls are absolute and must be left as-is
	{
		name: "css-publicpath",
		mode: "development",
		target: "web",
		entry: { "css-publicpath": "./src/main-css-url.js" },
		output: {
			filename: "[name].[contenthash].js",
			cssFilename: "styles/[name].[contenthash].css",
			assetModuleFilename: "assets/[hash][ext]",
			htmlFilename: "css-publicpath.html",
			publicPath: "/pub/",
			html: { inline: true }
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	},
	// two pages sharing a chunk: page-a inlines it (magic comment), page-b links
	// it — the shared file must survive because page-b still references it
	{
		name: "shared",
		mode: "development",
		target: "web",
		entry: {
			"page-a": "./src/page-a.html",
			"page-b": "./src/page-b.html"
		},
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: "[name].html"
		},
		optimization: {
			runtimeChunk: "single",
			splitChunks: {
				cacheGroups: {
					shared: {
						test: /shared-lib/,
						name: "shared",
						chunks: "all",
						enforce: true
					}
				}
			}
		},
		experiments: { html: true, css: true },
		plugins: [copyTest]
	}
];
