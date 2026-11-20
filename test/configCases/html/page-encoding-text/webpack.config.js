"use strict";

const { HtmlModulesPlugin } = require("../../../../").html;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		bundle0: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		html: { csp: true }
	},
	node: { __dirname: false },
	optimization: {
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("InjectUnicode", (compilation) => {
				HtmlModulesPlugin.getCompilationHooks(compilation).injectTags.tap(
					"InjectUnicode",
					(tags) => [
						...tags,
						// "日" is no character of windows-1252
						{ tag: "meta", attrs: { name: "word", content: "日" } },
						{ tag: "script", children: 'window.__word = "日";' },
						{ tag: "template", children: 'window.__late = "日";' }
					]
				);
				HtmlModulesPlugin.getCompilationHooks(compilation).transformTags.tap(
					"InjectUnicode",
					(tags) => {
						for (const tag of tags) {
							if (tag.tag === "template") tag.tag = "script";
						}
					}
				);
			});
		}
	],
	experiments: { css: true, html: true }
};
