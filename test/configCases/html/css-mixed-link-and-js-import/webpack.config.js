"use strict";

// Mixed-source CSS in one HTML entry:
//   page.html  -- `<link rel="stylesheet" href="./linked.css">` plus a
//                 `<script src="./entry.js">`. The link gets its own
//                 CSS entry; the script's bundled JS additionally
//                 imports two more `.css` files, one of which chains
//                 to a third via plain CSS `@import`.
// What we exercise:
//   1. `<link>` and `<script>` paths coexist in the extracted HTML —
//      the link's `href` is rewritten to the stylesheet entry's CSS
//      chunk, the script gets its own `<link>` for the entry chunk's
//      CSS in addition to the `<script>` itself.
//   2. CSS source-order semantics: `<link>` appears before `<script>`
//      in the HTML, so the linked CSS cascades first; among the
//      script-side CSS files, they cascade in JS import order.
//   3. CSS `@import` inside a JS-imported `.css` is followed by the
//      CSS pipeline; the imported file ends up in the same chunk as
//      the importer, so no extra `<link>` shows up for it.

const fs = require("node:fs");
const path = require("node:path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: { chunkIds: "named" },
	experiments: { html: true, css: true },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(path.resolve(__dirname, "test.js"));
							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
};
