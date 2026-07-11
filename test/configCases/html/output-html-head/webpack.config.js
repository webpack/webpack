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
	// synthetic HTML — title + charset + non-charset metas + og + base object
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
	// synthetic HTML — title only
	{
		name: "synthetic-title",
		entry: { "synthetic-title": { import: ["./src/main.js"], html: true } },
		output: { html: { title: "Title Only" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// synthetic HTML — base as plain string
	{
		name: "synthetic-base",
		entry: { "synthetic-base": { import: ["./src/main.js"], html: true } },
		output: { html: { base: "/static/" } },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// authored HTML — inject all into empty head
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
	// authored HTML — existing title/charset/base must NOT be overwritten
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
	}
];
