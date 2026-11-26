"use strict";

const { HtmlModulesPlugin } = require("../../../../").html;

/** @import { Configuration } from "../../../../" */

const SITE = "(window.__sites = window.__sites || []).push(((s) => s)`日`);";

/** @type {Configuration} */
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
						// a tagged template reads its raw text, which no escape keeps
						{ tag: "script", children: "window.__raw = String.raw`日`;" },
						// two equal scripts, whose templates are separate sites
						{ tag: "script", children: SITE },
						{ tag: "script", children: SITE },
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
