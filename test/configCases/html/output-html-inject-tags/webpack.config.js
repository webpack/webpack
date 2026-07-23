"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const HtmlModulesPlugin = require("../../../../lib/html/HtmlModulesPlugin");

/** @typedef {import("../../../../lib/html/HtmlModulesPlugin").HtmlTagDescriptor} HtmlTagDescriptor */

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

/**
 * A plugin that pushes the given descriptors via `injectTags`. An array of
 * arrays registers several taps (to check the waterfall accumulates).
 * @param {HtmlTagDescriptor[] | HtmlTagDescriptor[][]} groups tags per tap
 * @returns {import("../../../../").WebpackPluginInstance} the plugin
 */
const tagPlugin = (groups) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("TagPlugin", (compilation) => {
			const taps = Array.isArray(groups[0]) ? groups : [groups];
			for (const [i, tags] of taps.entries()) {
				HtmlModulesPlugin.getCompilationHooks(
					/** @type {EXPECTED_ANY} */ (compilation)
				).injectTags.tap(`TagPlugin${i}`, (list) => {
					list.push(.../** @type {HtmlTagDescriptor[]} */ (tags));
					return list;
				});
			}
		});
	}
});

/** @type {(name: string, plugin: import("../../../../").WebpackPluginInstance, entry?: string, html?: { csp?: boolean }) => import("../../../../").Configuration} */
const config = (name, plugin, entry = "./src/main.js", html = {}) => ({
	name,
	target: "web",
	entry: { [name]: entry },
	output: { filename: `${name}.js`, htmlFilename: `${name}.html`, html },
	experiments: { html: true },
	optimization: { minimize: false },
	plugins: [copyTest, plugin]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// no tap — HTML is unchanged
	config("default", { apply() {} }),
	// all four injectTo positions (JS entry → empty head, script in body)
	config(
		"positions",
		tagPlugin([
			{ tag: "meta", attrs: { name: "theme-color", content: "#0b5" } },
			{
				tag: "link",
				attrs: { rel: "preconnect", href: "https://cdn.example.com" },
				injectTo: "head-prepend"
			},
			{ tag: "script", attrs: { src: "/a.js", defer: true }, injectTo: "body" },
			{ tag: "noscript", children: "no js", injectTo: "body-prepend" }
		])
	),
	// attribute + void handling
	config(
		"attrs",
		tagPlugin([
			// boolean true → bare attr; false/undefined omitted; value escaped
			{
				tag: "script",
				attrs: {
					src: 'a"b.js',
					async: true,
					nomodule: false,
					crossorigin: undefined
				},
				injectTo: "body"
			},
			// normally-void <link> forced to a closing tag via voidTag: false
			{ tag: "link", attrs: { rel: "x" }, voidTag: false, children: "y" }
		])
	),
	// existing head content — prepend before it, append after it
	config(
		"authored",
		tagPlugin([
			{ tag: "meta", attrs: { name: "a" } },
			{ tag: "meta", attrs: { name: "b" }, injectTo: "head-prepend" }
		]),
		"./src/page.html"
	),
	// two taps accumulate through the waterfall
	config(
		"multi",
		tagPlugin([
			[{ tag: "meta", attrs: { name: "one" } }],
			[{ tag: "meta", attrs: { name: "two" } }]
		])
	),
	// injected inline <script> is hashed by CSP (tags run before CSP)
	config(
		"csp",
		tagPlugin([{ tag: "script", children: "console.log(1)" }]),
		"./src/main.js",
		{ csp: true }
	)
];
