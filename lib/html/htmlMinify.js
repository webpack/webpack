/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one HTML asset's minimized form. Every node is
 * rebuilt from its parsed form to the same DOM (text whitespace and attribute
 * values preserved); the only transform is dropping inert comments (conditional
 * / SSI comments are kept). HTML minification thus reuses that plugin's pipeline
 * — caching and worker-thread parallelization.
 *
 * The parser is read from the public `webpack.html.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: safe serialize keeps positions token-coarse, so no map is produced yet)
 * @param {object=} minimizerOptions minimizer options (none used yet)
 * @returns {{ code: string }} the minified HTML
 */
const htmlMinify = (input, sourceMap, minimizerOptions = {}) => {
	// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
	const webpack = require(/** @type {string} */ ("webpack"));

	const { SourceProcessor } = /** @type {typeof import("../index")} */ (webpack)
		.html.syntax;
	const [[, code]] = Object.entries(input);
	// `process` parses once, and with `minimize` its walk also prints the safely
	// minified serialization and returns it — no second parse.
	return { code: new SourceProcessor().process(code, { minimize: true }) };
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
