"use strict";

const {
	html: { HtmlModulesPlugin }
} = require("../../");

// Safari 10.1 (and a few old Edge/Firefox builds) support ES modules but not
// the `nomodule` attribute, so they run *both* scripts. This standard one-liner
// marks such engines so the `nomodule` classic bundle doesn't double-execute.
const SAFARI_NOMODULE_FIX =
	'!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();';

// The classic build's entry file name — fixed (no content hash) so the modern
// build can reference it without waiting for the classic build to finish.
const LEGACY_FILE = "app.legacy.js";

// Injects the `nomodule` classic fallback (and the Safari fix) into the modern
// page via the `alterAssetTags` hook. The modern entry `<script>` is already
// `type="module"` because that build uses `output.module`, so legacy browsers
// skip it and run the `nomodule` bundle instead.
class NoModuleFallbackPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NoModuleFallbackPlugin", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(compilation).alterAssetTags.tap(
				"NoModuleFallbackPlugin",
				(tags) => {
					tags.push(
						{ tag: "script", children: SAFARI_NOMODULE_FIX, injectTo: "head" },
						{
							tag: "script",
							attrs: { nomodule: true, defer: true, src: LEGACY_FILE },
							injectTo: "body"
						}
					);
					return tags;
				}
			);
		});
	}
}

/** @type {import("../../").Configuration[]} */
const config = [
	{
		name: "modern",
		target: "web",
		// ES module output → the HTML entry's `<script>` is emitted as
		// `type="module"`, which browsers without ESM support skip.
		entry: { page: "./src/index.html" },
		output: {
			filename: "[name].modern.js",
			htmlFilename: "[name].html",
			module: true
		},
		experiments: { html: true, outputModule: true },
		plugins: [new NoModuleFallbackPlugin()]
	},
	{
		name: "legacy",
		target: "web",
		// The classic (non-module) bundle loaded via the injected
		// `<script nomodule>`. A real project adds a transpiling loader
		// (babel/swc) with old `targets` here; only this build needs it.
		entry: { app: "./src/app.js" },
		output: { filename: LEGACY_FILE }
	}
];

module.exports = config;
