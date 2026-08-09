/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("../css/syntax").CssEnvironment} CssEnvironment */
/** @typedef {import("terser").MinifyOptions} TerserOptions */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one HTML asset's minimized form. Every node is
 * rebuilt from its parsed form to the same DOM (text whitespace and attribute
 * values preserved); the transforms are dropping inert comments (conditional /
 * SSI comments are kept) and rewriting opening tags to their shortest equivalent
 * spelling. HTML minification thus reuses that plugin's pipeline — caching and
 * worker-thread parallelization.
 *
 * The parser is read from the public `webpack.html.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: safe serialize keeps positions token-coarse, so no map is produced yet)
 * @param {object=} minimizerOptions minimizer options — `environment` carries the target's CSS abilities for the inline CSS this minifies, `terserOptions` the JS ones for an inline `<script>`
 * @returns {Promise<{ code: string }>} the minified HTML
 */
const htmlMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO offer dropping a default-valued attribute (`<script type=text/javascript>`,
	// `<form method=get>`, `<input type=text>`) behind an option, off by default.
	// It is not safe on its own terms: an attribute selector matches the content
	// attribute, not the reflected default, so `input[type=text]` — the most
	// common selector in a CSS framework — stops matching the element it styled,
	// and `querySelectorAll('script[type=...]')` stops finding it. Checked in
	// headless Chromium: with the attribute and without it, each selector matched
	// only the one that kept it. html-minifier-terser and htmlnano keep it off by
	// default for the same reason; minify-html and @swc/html drop it. Worth 0
	// bytes on three of the four benchmark fixtures.
	// TODO expose the value rewrites as options. `style` / `class` / `srcset` /
	// viewport `content` and boolean-attribute collapsing keep what the DOM
	// parses but change the attribute string a script reads back, so a consumer
	// that compares those bytes wants a way to turn each off. Room to widen them
	// too: any boolean value rather than only the canonical spellings.
	const { SourceProcessor } = webpack.html.syntax;
	const [[, code]] = Object.entries(input);
	// An inline `<style>` or `style=""` runs through the CSS minifier, and an
	// inline `<script>` through terser, so both need the options their own asset
	// type gets — otherwise a `.css` / `.js` asset and the same source inline
	// would disagree.
	const { environment, terserOptions } =
		/** @type {{ environment?: CssEnvironment, terserOptions?: TerserOptions }} */ (
			minimizerOptions
		);
	// Printing is synchronous and terser is not, so the first pass collects the
	// inline scripts (leaving each as written) and the second prints with the
	// resolved bodies. An asset with no inline script takes only the first.
	/** @type {[string, boolean][]} */
	const scripts = [];
	const { code: collected } = new SourceProcessor().process(code, {
		minimize: true,
		environment,
		minifyJs: (js, isModule) => {
			scripts.push([js, isModule]);
		}
	});
	if (scripts.length === 0) return { code: collected };

	// eslint-disable-next-line n/no-unpublished-require -- resolved in the worker like `webpack` above; terser already minifies this build's JS assets
	const { minify } = require("terser");

	// A body terser could not turn into code maps to undefined, which the hook
	// reads as "keep it as written".
	/** @type {Map<string, string | undefined>} */
	const minified = new Map();
	// `format` is terser's current spelling of `output`, so read whichever the JS
	// assets were given and hand it back as one.
	const { format, output, ...rest } = terserOptions || {};
	for (const [js, isModule] of scripts) {
		if (minified.has(js)) continue;
		try {
			// `module` decides the parse goal: a module's top level is its own scope,
			// so terser may rename what a classic script has to leave global.
			// `inline_script` escapes a `</script>` the output would otherwise carry,
			// which the element it sits in would end at.
			const result = await minify(js, {
				...rest,
				module: isModule,
				sourceMap: false,
				// eslint-disable-next-line camelcase -- terser's own option name
				format: { ...(format || output), inline_script: true }
			});
			minified.set(js, result.code);
		} catch (_err) {
			// Not JavaScript after all (a template, a placeholder) — not ours to touch.
		}
	}
	const { code: out } = new SourceProcessor().process(code, {
		minimize: true,
		environment,
		minifyJs: (js) => minified.get(js)
	});
	return { code: out };
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
htmlMinify.supportsWorkerThreads = () => true;

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims HTML, so terser (JS), cssMinify and this can coexist in a single
// plugin / worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for HTML assets
 */
htmlMinify.filter = (name) => /\.html(\?.*)?$/i.test(name);

module.exports = htmlMinify;
