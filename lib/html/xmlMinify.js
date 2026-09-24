/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { CssEnvironment } from "../css/syntax-parser" */
/** @import { RawSourceMap } from "webpack-sources" */

/**
 * A `minify` function for `minimizer-webpack-plugin`: prints one `.svg` or `.xml`
 * asset minified, reading it as XML 1.0 and minifying each SVG or XHTML stylesheet
 * it holds with the CSS minifier.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: the printer is token-coarse, so no map is produced)
 * @param {{ environment?: CssEnvironment, css?: { convertLengthUnits?: boolean, convertApproximateColors?: boolean, dropOverriddenDeclarations?: boolean, rewriteCustomProperties?: boolean, unusedSymbols?: string[], pseudoClasses?: { [name: string]: string } } }=} minimizerOptions `environment` and `css` (`optimization.minimizeOptions.css`, whole) reach the CSS minifier this runs over each stylesheet
 * @returns {Promise<{ code: string }>} the minified document
 */
const xmlMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	const [[, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	const { environment, css = {} } = minimizerOptions;
	// The same renderer and options HTML hands an inline `<style>`, so a
	// stylesheet an SVG holds agrees with the `.css` asset for the same target.
	const renderEmbeddedSource = webpack.html.builtinEmbeddedRenderer({
		environment,
		convertLengthUnits: css.convertLengthUnits,
		convertApproximateColors: css.convertApproximateColors,
		dropOverriddenDeclarations: css.dropOverriddenDeclarations,
		rewriteCustomProperties: css.rewriteCustomProperties,
		unusedSymbols: css.unusedSymbols,
		pseudoClasses: css.pseudoClasses,
		transforms: webpack.css.syntax.parser.pickTransforms(css)
	});
	return {
		code: new webpack.html.syntax.SourceProcessor().process(code, {
			xml: true,
			mode: "minify",
			renderEmbeddedSource
		}).code
	};
};

// Worker-safe (see the body's in-worker `require`), so it may share the pool.
xmlMinify.supportsWorkerThreads = () => true;

/**
 * The language this minifies, for a caller dispatching source with no filename.
 * @returns {string[]} the languages
 */
xmlMinify.getTypes = () => ["xml"];

/**
 * @param {string} name asset filename
 * @returns {boolean} true for SVG and XML assets
 */
xmlMinify.filter = (name) => /\.(?:svg|xml)(\?.*)?$/i.test(name);

module.exports = xmlMinify;
