"use strict";

const {
	html: { HtmlModulesPlugin }
} = require("../../");

// The `transformTags` hook hands a plugin the page's already-present
// `<script>`/`<link>`/`<style>`/`<meta>` tags as mutable descriptors: mutate
// `attrs`, set `remove: true`, or change `injectTo` to move a tag between
// `<head>` and `<body>`. Webpack rewrites only the changed tags; untouched tags
// stay byte-for-byte. (Use `injectTags` to add brand-new tags — see the `html`
// and `html-module-nomodule` examples.)
class TransformTagsPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("TransformTagsPlugin", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(compilation).transformTags.tap(
				"TransformTagsPlugin",
				(tags) => {
					for (const tag of tags) {
						// Add CORS to every external script / stylesheet.
						if (
							(tag.tag === "script" && tag.attrs.src) ||
							(tag.tag === "link" && tag.attrs.rel === "stylesheet")
						) {
							tag.attrs.crossorigin = "anonymous";
						}
						// Move render-blocking scripts out of <head> to the end of
						// <body>, deferred — via `injectTo`.
						if (tag.tag === "script" && tag.injectTo === "head") {
							tag.injectTo = "body";
							tag.attrs.defer = true;
						}
						// Drop a dev-only marker <meta> from the shipped page.
						if (tag.tag === "meta" && tag.attrs.name === "debug") {
							tag.remove = true;
						}
					}
				}
			);
		});
	}
}

/** @type {import("../../").Configuration} */
module.exports = {
	entry: { index: "./src/index.html" },
	experiments: { html: true },
	plugins: [new TransformTagsPlugin()]
};
