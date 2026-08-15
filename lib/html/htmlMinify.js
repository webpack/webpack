/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { HtmlPrintOptions } from "../html/syntax" */
/** @import { RawSourceMap } from "webpack-sources" */

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
 * @param {HtmlPrintOptions & { minifyConditionalComments?: boolean }=} minimizerOptions minimizer options — `environment`, `convertLengthUnits` and `rewriteCustomProperties` reach the CSS minifier this runs over inline CSS; the rest is `optimization.minimize.html`
 * @returns {{ code: string }} the minified HTML
 */
const htmlMinify = (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO accept a JS minify function here so an inline `<script>` can be
	// minified: terser is async and reaches webpack only via the minimizer
	// plugin, which already holds one.
	const { SourceProcessor, NodeType } = webpack.html.syntax;
	const [[, code]] = Object.entries(input);
	// The nested CSS minifier gets the abilities and options a `.css` asset
	// gets, or the inline copy of a declaration would disagree with it.
	const {
		environment,
		convertLengthUnits,
		rewriteCustomProperties,
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		preserveComments,
		removeRedundantAttributes,
		minifyConditionalComments,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags,
		collapseBooleanAttributes,
		normalizeAttributeValues,
		minifyStyleAttribute,
		removeAttributeQuotes
	} = minimizerOptions;
	// One set of options, handed to the document pass and to each conditional
	// comment's body below.
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		environment,
		convertLengthUnits,
		rewriteCustomProperties,
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		preserveComments,
		removeRedundantAttributes,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags,
		collapseBooleanAttributes,
		normalizeAttributeValues,
		minifyStyleAttribute,
		removeAttributeQuotes
	};
	// A downlevel-hidden conditional comment holds markup, and it cannot be
	// minified where it is found: the visitor that finds it runs inside the
	// document's own parse, and the walk state is module-scoped, so `grammar`
	// refuses to start a second one. The bodies are therefore recorded as the
	// document prints — a visitor rides the walk that prints, so this costs no
	// extra parse — and each is minified afterwards and spliced in by exact
	// source text, never by a pattern over the output, which would find a
	// `<!--[if` written inside a script.
	/** @type {Map<string, string>} */
	const conditionals = new Map();
	// One processor for both passes. It stops recording once the document is
	// printed, so a body carrying something that looks like another conditional
	// comment cannot write into the map being read below.
	let recording = true;
	const processor = new SourceProcessor();
	if (minifyConditionalComments) {
		processor.use({
			[NodeType.Comment]: (path) => {
				if (!recording) return;
				const source = path.source();
				const opened = source.indexOf("]>");
				const closes = source.lastIndexOf("<![endif]");
				if (!/^<!--\[if\s/i.test(source) || opened === -1 || closes <= opened) {
					return;
				}
				conditionals.set(source, source.slice(opened + 2, closes));
			}
		});
	}
	// `process` parses once, and with `mode: "minify"` its walk also prints the
	// safely minified serialization — no second parse. No `source` is named, so no
	// map is built: the HTML serialize is token-coarse and only the code is used.
	const { code: out } = processor.process(code, printOptions);
	recording = false;
	if (conditionals.size === 0) return { code: out };
	let spliced = out;
	for (const [source, body] of conditionals) {
		if (!spliced.includes(source)) continue;
		const { code: minified } = processor.process(body, printOptions);
		if (minified === body) continue;
		spliced = spliced.split(source).join(source.replace(body, minified));
	}
	return { code: spliced };
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
