/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("../Compilation").AssetInfo} AssetInfo */
/** @typedef {import("../util/SourceProcessor").SourceMap} SourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one CSS asset's minimized form (collapse
 * whitespace, drop redundant separators, keep strings / `url(...)` /
 * custom-property values verbatim), so CSS minification reuses that plugin's
 * pipeline — source maps, caching and worker-thread parallelization.
 *
 * The parser is read from the public `webpack.css.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {object=} minimizerOptions minimizer options (none used yet)
 * @returns {{ code: string, map: SourceMap }} the minified CSS and its input->output source map
 */
const cssMinify = (input, sourceMap, minimizerOptions = {}) => {
	// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
	const webpack = require(/** @type {string} */ ("webpack"));

	const { SourceProcessor } = /** @type {typeof import("../index")} */ (webpack)
		.css.syntax;
	const [[file, code]] = Object.entries(input);
	// `process` parses once, and with `minimize` the same walk also prints the
	// safely minified serialization — no second parse — and always returns
	// `{ code, map }`. `source` / `content` name the map so the plugin can compose
	// it back to the original source.
	return new SourceProcessor().process(code, {
		minimize: true,
		source: file,
		content: code
	});
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
cssMinify.supportsWorkerThreads = () => true;

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims CSS, so terser (JS) and this can coexist in a single plugin / worker pool.
// It claims only what `CssModulesPlugin` rendered (the `css` asset-info marker):
// a `.css` asset another plugin emitted was never parsed by webpack, so
// re-serializing it could change bytes it is not allowed to change.
/**
 * @param {string} name asset filename
 * @param {AssetInfo=} info the asset's info, when the caller tracks it
 * @returns {boolean} true for CSS assets webpack rendered
 */
cssMinify.filter = (name, info) =>
	info !== undefined ? info.css === true : /\.css(\?.*)?$/i.test(name);

module.exports = cssMinify;
