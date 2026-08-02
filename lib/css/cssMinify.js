/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("./syntax").CssEnvironment} CssEnvironment */
/** @typedef {import("./syntax").CssTransformOptions} CssTransformOptions */
/** @typedef {import("../util/SourceProcessor").SourceMap} SourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one CSS asset's minimized form (collapse
 * whitespace, drop redundant separators and empty rules, shorten colors /
 * numbers / easing functions / identifier escapes, normalize string and `url()`
 * quoting, keep custom-property values verbatim), so CSS minification reuses
 * that plugin's pipeline — source maps, caching and worker-thread parallelization.
 *
 * The parser is read from the public `webpack.css.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {object=} minimizerOptions minimizer options — `environment` carries the target's CSS abilities (see `output.environment`), so a spelling the target cannot read is not reached for; `transforms` names the rewrites to make beyond the safe default, each off unless asked for
 * @returns {{ code: string, map: SourceMap }} the minified CSS and its input->output source map
 */
const cssMinify = (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// `transforms.customPropertyValues` is the first of these; the rest are still
	// TODO, each to be off by default. Every one is something csso, cssnano,
	// lightningcss or esbuild ships on, and every one costs something a build may
	// not want to pay:
	// - dropping a declaration a later one overrides, which loses a fallback pair
	//   an engine that cannot read the newer spelling depends on;
	// - merging rules that share a block, and merging non-adjacent `@media`, both
	//   of which reorder the cascade (csso loses ~12,900 Tailwind classes to it);
	// - rounding a number's precision, and converting a unit or a color function
	//   whose result rounds to a different byte than the engine's: the `hsl()`
	//   that lands on a byte exactly already converts, so what an option would
	//   add is the rounding-dependent rest of it, plus `hwb()` / `lab()` / `lch()`
	//   — none of which two minifiers currently agree on.
	const { SourceProcessor } = webpack.css.syntax;
	const [[file, code]] = Object.entries(input);
	// `process` parses once, and with `minimize` the same walk also prints the
	// safely minified serialization — no second parse — and always returns
	// `{ code, map }`. `source` / `content` name the map so the plugin can compose
	// it back to the original source.
	return new SourceProcessor().process(code, {
		minimize: true,
		source: file,
		content: code,
		environment: /** @type {{ environment?: CssEnvironment }} */ (
			minimizerOptions
		).environment,
		transforms: /** @type {{ transforms?: CssTransformOptions }} */ (
			minimizerOptions
		).transforms
	});
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
cssMinify.supportsWorkerThreads = () => true;

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims CSS, so terser (JS) and this can coexist in a single plugin / worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for CSS assets
 */
cssMinify.filter = (name) => /\.css(\?.*)?$/i.test(name);

module.exports = cssMinify;
