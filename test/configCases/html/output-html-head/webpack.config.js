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

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "synthetic-all",
		entry: { "synthetic-all": { import: ["./src/main.js"], html: true } },
		output: {
			html: {
				title: "My App",
				meta: {
					// eslint-disable-next-line unicorn/text-encoding-identifier-case
					charset: "UTF-8",
					viewport: "width=device-width, initial-scale=1",
					description: "A test page",
					"og:title": "My App OG",
					"twitter:card": "summary"
				},
				base: { href: "/app/", target: "_self" }
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "synthetic-title",
		entry: { "synthetic-title": { import: ["./src/main.js"], html: true } },
		output: { html: { title: "Title Only" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "synthetic-base",
		entry: { "synthetic-base": { import: ["./src/main.js"], html: true } },
		output: { html: { base: "/static/" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-all",
		entry: { "authored-all": "./src/page.html" },
		output: {
			html: {
				title: "Authored Title",
				meta: {
					// eslint-disable-next-line unicorn/text-encoding-identifier-case
					charset: "UTF-8",
					viewport: "width=device-width, initial-scale=1"
				},
				base: "/cdn/"
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-existing",
		entry: { "authored-existing": "./src/page-existing.html" },
		output: {
			html: {
				title: "Should Not Override",
				// eslint-disable-next-line unicorn/text-encoding-identifier-case
				meta: { charset: "UTF-8" },
				base: "/should-not-override/"
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "authored-base-only",
		entry: { "authored-base-only": "./src/page-nocharset.html" },
		output: { html: { base: "/assets/" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "special-chars",
		entry: { "special-chars": "./src/page-special-chars.html" },
		output: {
			html: {
				title: "Save $$$ now & more",
				meta: { description: "worth $& to $` you", "line-break": "a\nb" }
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "implicit-head",
		entry: { "implicit-head": "./src/page-implicit-head.html" },
		output: {
			html: {
				title: "No Head Doc",
				// eslint-disable-next-line unicorn/text-encoding-identifier-case
				meta: { charset: "utf-8" },
				base: "/x/"
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "svg-title",
		entry: { "svg-title": "./src/page-svg-title.html" },
		output: { html: { title: "Real Page Title" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "charset-word",
		entry: { "charset-word": "./src/page-charset-word.html" },
		// eslint-disable-next-line unicorn/text-encoding-identifier-case
		output: { html: { meta: { charset: "utf-8" } } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "dup-meta",
		entry: { "dup-meta": "./src/page-dup-meta.html" },
		output: {
			html: {
				meta: {
					viewport: "width=device-width, initial-scale=1",
					description: "from options",
					keywords: "from,options",
					"og:title": "Options OG",
					author: "Options Author"
				}
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "httpequiv",
		entry: { httpequiv: "./src/page-httpequiv.html" },
		output: {
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			html: { meta: { charset: "utf-8" }, base: "/after-charset/" }
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "bare",
		entry: { bare: "./src/page-bare.html" },
		output: { html: { title: "Bare Fragment" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "doctype-only",
		entry: { "doctype-only": "./src/page-doctype-only.html" },
		output: { html: { title: "Doctype Only" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "synthetic-newline",
		entry: { "synthetic-newline": { import: ["./src/main.js"], html: true } },
		output: { html: { title: "Line1\nLine2" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "comment",
		entry: { comment: "./src/page-comment.html" },
		output: {
			html: {
				title: "Comment Proof",
				// eslint-disable-next-line unicorn/text-encoding-identifier-case
				meta: { charset: "utf-8" },
				base: "/real/"
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "template",
		entry: { template: "./src/page-template.html" },
		output: {
			html: {
				meta: { viewport: "vp-from-options", existing: "no" }
			}
		},
		experiments: { html: true },
		plugins: [copyTest]
	},
	{
		name: "entity-meta",
		entry: { "entity-meta": "./src/page-entity-meta.html" },
		output: { html: { meta: { description: "from options" } } },
		experiments: { html: true },
		plugins: [copyTest]
	}
];
