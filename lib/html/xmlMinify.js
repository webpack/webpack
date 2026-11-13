/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { CssEnvironment, CssTransformOptions } from "../css/syntax-parser" */
/** @import { OptimizationMinimizeXml } from "../../declarations/WebpackOptions" */
/** @import { RawSourceMap } from "webpack-sources" */

/**
 * A `minify` function for `minimizer-webpack-plugin`: prints one `.svg` or `.xml`
 * asset minified, reading it as XML 1.0 and minifying each SVG or XHTML stylesheet
 * it holds with the CSS minifier.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: the printer is token-coarse, so no map is produced)
 * @param {OptimizationMinimizeXml & { environment?: CssEnvironment, css?: { convertLengthUnits?: boolean, convertApproximateColors?: boolean, dropOverriddenDeclarations?: boolean, rewriteCustomProperties?: boolean, unusedSymbols?: string[], pseudoClasses?: { [name: string]: string } } & CssTransformOptions }=} minimizerOptions `environment` and `css` (`optimization.minimizeOptions.css`, whole) reach the CSS minifier this runs over each stylesheet
 * @returns {Promise<{ code: string, warnings?: string[], errors?: Error[] }>} the minified document, why it was left as written, and what the CSS minifier threw on a stylesheet it left as written
 */
const xmlMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	const [[, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	// Read as UTF-8 here, a document in another encoding could spell markup it
	// never holds through its bytes past printable ASCII.
	const declaration =
		/^\uFEFF?<\?xml[\t\n\r ][^>]*?\bencoding[\t\n\r ]*=[\t\n\r ]*(["'])([^"']*)\1/.exec(
			code
		);
	if (
		declaration !== null &&
		!/^utf-?8$/i.test(declaration[2]) &&
		/[^\t\n\f\r -~]/.test(code)
	) {
		return {
			code,
			warnings: [
				"Left as written: the document declares an encoding other than UTF-8, which the XML minifier reads only as UTF-8"
			]
		};
	}
	const {
		environment,
		css = {},
		collapseWhitespace,
		sortAttributes,
		removeMetadata,
		removeEditorData,
		removeEmptyAttributes,
		removeEmptyElements,
		shortenColors,
		shortenNumbers,
		shortenPathData,
		sortSymbols,
		convertShapes,
		cleanupStructure,
		mergePaths,
		reusePaths,
		sortDefinitions,
		removeUnusedNamespaces
	} = minimizerOptions;
	/** @type {Error[]} */
	const errors = [];
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
		// Picked on first CSS render, which loads the CSS parser anyway.
		get transforms() {
			return webpack.css.syntax.parser.pickTransforms(css);
		},
		reportError: (error) => {
			errors.push(error);
		}
	});
	const result = {
		code: new webpack.html.syntax.SourceProcessor().process(code, {
			xml: true,
			mode: "minify",
			collapseWhitespace,
			shortenSvgNumbers: shortenNumbers,
			shortenSvgColors: shortenColors,
			shortenSvgPathData: shortenPathData,
			sortSvgSymbols: sortSymbols,
			convertSvgShapes: convertShapes,
			cleanupSvgStructure: cleanupStructure,
			mergeSvgPaths: mergePaths,
			reuseSvgPaths: reusePaths,
			sortSvgDefinitions: sortDefinitions,
			sortAttributes,
			removeSvgMetadata: removeMetadata,
			removeSvgEditorData: removeEditorData,
			removeEmptyAttributes,
			removeEmptyElements,
			removeUnusedSvgNamespaces: removeUnusedNamespaces,
			renderEmbeddedSource
		}).code
	};
	return errors.length === 0 ? result : { ...result, errors };
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
xmlMinify.filter = (name) => /^[^?#]*\.(?:svg|xml)(?:[?#].*)?$/i.test(name);

module.exports = xmlMinify;
