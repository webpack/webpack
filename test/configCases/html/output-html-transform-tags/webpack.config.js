"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const HtmlModulesPlugin = require("../../../../lib/html/HtmlModulesPlugin");

/** @typedef {import("../../../../lib/html/HtmlModulesPlugin").HtmlMutableTag} HtmlMutableTag */

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

/** @type {(mutate: (tags: HtmlMutableTag[]) => void) => import("../../../../").WebpackPluginInstance} */
const alterPlugin = (mutate) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("AlterPlugin", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(
				/** @type {EXPECTED_ANY} */ (compilation)
			).transformTags.tap("AlterPlugin", mutate);
		});
	}
});

/** @type {(name: string, plugin?: import("../../../../").WebpackPluginInstance) => import("../../../../").Configuration} */
const config = (name, plugin) => ({
	name,
	target: "web",
	entry: { [name]: "./src/page.html" },
	output: { filename: `${name}.js`, htmlFilename: `${name}.html` },
	experiments: { html: true },
	optimization: { minimize: false },
	plugins: plugin ? [copyTest, plugin] : [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// no transformTags tap — tags untouched
	config("default"),
	// add a nonce to every <script>
	config(
		"nonce",
		alterPlugin((tags) => {
			for (const t of tags) if (t.tag === "script") t.attrs.nonce = "__N__";
		})
	),
	// remove the <meta name="theme">
	config(
		"remove",
		alterPlugin((tags) => {
			for (const t of tags) {
				if (t.tag === "meta" && t.attrs.name === "theme") t.remove = true;
			}
		})
	),
	// drop an existing attribute (`defer`) and add another (`crossorigin`)
	config(
		"attr",
		alterPlugin((tags) => {
			for (const t of tags) {
				if (t.tag === "script") {
					t.attrs.defer = false;
					t.attrs.crossorigin = "anonymous";
				}
			}
		})
	),
	// move the <script> from <body> into <head> (also changing an attribute) and
	// the theme <meta> from <head> to the start of <body>
	config(
		"move",
		alterPlugin((tags) => {
			for (const t of tags) {
				if (t.tag === "script") {
					t.injectTo = "head";
					t.attrs.crossorigin = "anonymous";
				}
				if (t.tag === "meta" && t.attrs.name === "theme") {
					t.injectTo = "body-prepend";
				}
			}
		})
	),
	// move to the other two anchors: <script> to the start of <head>, the theme
	// <meta> to the end of <body>
	config(
		"move2",
		alterPlugin((tags) => {
			for (const t of tags) {
				if (t.tag === "script") t.injectTo = "head-prepend";
				if (t.tag === "meta" && t.attrs.name === "theme") t.injectTo = "body";
			}
		})
	),
	// tap but mutate nothing — output must stay byte-identical
	config(
		"noop",
		alterPlugin(() => {})
	)
];
