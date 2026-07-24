/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

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
 * @param {object=} sourceMap the input source map — when present (webpack `devtool` is on) a map from this asset to the minified output is produced and the plugin chains it back to the original sources
 * @param {object=} minimizerOptions minimizer options (none used yet)
 * @returns {{ code: string, map?: SourceMap }} the minified CSS (and its map when `sourceMap` was given)
 */
const cssMinify = (input, sourceMap, minimizerOptions = {}) => {
	// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
	const webpack = require(/** @type {string} */ ("webpack"));

	const { SourceProcessor } = /** @type {typeof import("../index")} */ (webpack)
		.css.syntax;
	const [[file, code]] = Object.entries(input);
	const processor = new SourceProcessor();
	// `process` parses once, and with `minimize` its walk also prints the safely
	// minified serialization — no second parse. The `sourceMap` option (set only
	// when the pipeline provided an input map, as it costs a little per rule) makes
	// it also return `{ code, map }`.
	if (sourceMap === undefined) {
		return { code: processor.process(code, { minimize: true }) };
	}
	return processor.process(code, {
		minimize: true,
		sourceMap: { source: file, content: code }
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
