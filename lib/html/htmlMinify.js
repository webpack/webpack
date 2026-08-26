/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { DeferredEmbeddedSource, HtmlPrintOptions } from "../html/syntax" */

/**
 * What a renderer made of one embedded body: the minified text, and anything it
 * has to report about it. A bare string is the text alone.
 * @typedef {{ code?: string, warnings?: (Error | string)[], errors?: (Error | string)[] }} EmbeddedSourceResult
 */

/**
 * Minifies source a document embeds; may answer asynchronously.
 * @typedef {(source: string, info: { type: string, hostType: string, as?: string }) => Promise<string | EmbeddedSourceResult | undefined> | string | EmbeddedSourceResult | undefined} AsyncEmbeddedSourceRenderer
 */
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
 * @param {Omit<HtmlPrintOptions, "renderEmbeddedSource" | "deferEmbeddedSource"> & { css?: { convertLengthUnits?: boolean, rewriteCustomProperties?: boolean }, minifyConditionalComments?: boolean, minifySrcdoc?: boolean, renderEmbeddedSource?: AsyncEmbeddedSourceRenderer }=} minimizerOptions minimizer options — `environment` and `css` (`optimization.minimize.css`, whole) reach the CSS minifier this runs over inline CSS; the rest is `optimization.minimize.html`. The two stand apart rather than merged: both languages name a `quotes` and a `comments`, and one flat object would hand each the other's answer. `renderEmbeddedSource` minifies source this document embeds and may be asynchronous — one parse serves both it and the output — and `minifySrcdoc` takes an `<iframe srcdoc>` back off it, since it minifies one already
 * @returns {Promise<{ code: string, warnings?: (Error | string)[], errors?: (Error | string)[] }>} the minified HTML, and what a renderer reported over what it embeds
 */
const htmlMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO widen the value rewrites the switches below name: a boolean attribute
	// spelled any other way than its own name, an enumerated value the spec does
	// not name.
	const {
		askEmbeddedRenderer,
		collectEmbeddedDiagnostics,
		embeddedText,
		SourceProcessor,
		NodeType,
		NS_HTML,
		decodeEntities,
		escapeAttribute,
		pickTransforms
	} = webpack.html.syntax;
	const [[, code]] = Object.entries(input);
	// The nested CSS minifier gets the abilities and options a `.css` asset
	// gets, or the inline copy of a declaration would disagree with it.
	const {
		environment,
		css = {},
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		removeRedundantAttributes,
		minifyConditionalComments,
		minifySrcdoc,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags,
		renderEmbeddedSource
	} = minimizerOptions;
	// A `<iframe srcdoc>` the pre-pass below owns is not offered, or the same
	// document would be minified twice — once each, and the pre-pass keeps the
	// delimiter and reaches a value written bare, which the printer cannot.
	const ownsSrcdoc = Boolean(minifySrcdoc);
	// One list for the whole run: a nested document reaches this same collector,
	// so what a renderer reports inside an `<iframe srcdoc>` is reported once at
	// the top rather than lost at the level that heard it.
	/** @type {EmbeddedSourceResult[]} */
	const reported = [];
	// One set of options, handed to the document pass and to each conditional
	// comment's body below.
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		environment,
		convertLengthUnits: css.convertLengthUnits,
		rewriteCustomProperties: css.rewriteCustomProperties,
		// Each language picks its own switches out of its own options object.
		cssTransforms: webpack.css.syntax.pickTransforms(css),
		transforms: pickTransforms(minimizerOptions),
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		removeRedundantAttributes,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags
	};
	// Handed each body the print offers, with what it reported kept: how the
	// element or attribute around one is written is decided from the answer, and
	// a body declined or thrown on is spelled as an untapped run spells it.
	const renderer =
		renderEmbeddedSource === undefined
			? undefined
			: (/** @type {string} */ _source, /** @type {EXPECTED_ANY} */ hole) =>
					askEmbeddedRenderer(renderEmbeddedSource, hole, reported).then(
						embeddedText
					);
	/**
	 * @param {string} text a whole document
	 * @returns {Promise<string>} the same document, printed
	 */
	const printDocument = async (text) =>
		(
			await new SourceProcessor().processAsync(text, {
				...printOptions,
				// The pre-pass below minifies the document an `<iframe srcdoc>` holds,
				// so one is not offered here as well.
				deferSrcdoc: !ownsSrcdoc,
				renderEmbeddedSource: renderer
			})
		).code;

	// Recursion goes through this local name, never the module's own: the plugin
	// ships this function to its workers as source, where that binding is absent.
	// A marker cannot cross a parse — the HTML preprocessor turns its NUL into
	// U+FFFD — so each nested document is finished before it is spliced in.
	/**
	 * @param {string} text a whole document
	 * @returns {Promise<string>} the same document, minified
	 */
	const minifyDocument = async (text) => {
		// Put back into the source, not the output: the printer respells an
		// attribute value, so the recorded text is not what the output holds.
		let source = text;
		// Both are markup this parse cannot start a second one over, so both are
		// located in one walk and spliced afterwards. Their ranges never nest: a
		// `srcdoc` is an attribute value and a conditional comment's body is a
		// comment, neither of which this parse reads as markup.
		const wantsSrcdoc = Boolean(minifySrcdoc) && /srcdoc\s*=/i.test(source);
		const wantsConditional =
			Boolean(minifyConditionalComments) && /<!--\[if\s/i.test(source);

		if (wantsSrcdoc || wantsConditional) {
			/** @type {{ start: number, end: number, srcdoc: boolean, value: string }[]} */
			const found = [];
			/** @type {{ [type: number]: (path: EXPECTED_ANY) => void }} */
			const visitors = {};

			if (wantsSrcdoc) {
				visitors[NodeType.Element] = (path) => {
					// An `<iframe>` in foreign content is an SVG or MathML element that
					// happens to share the name, and its `srcdoc` is not this attribute.
					if (path.tagName() !== "iframe" || path.namespace() !== NS_HTML) {
						return;
					}

					for (const attribute of path.attributes()) {
						if (attribute.name !== "srcdoc" || attribute.value === "") continue;

						found.push({
							start: attribute.valueStart,
							end: attribute.valueEnd,
							srcdoc: true,
							value: attribute.value
						});
					}
				};
			}

			if (wantsConditional) {
				visitors[NodeType.Comment] = (path) => {
					const comment = path.source();
					const opened = comment.indexOf("]>");
					const closes = comment.lastIndexOf("<![endif]");

					if (
						!/^<!--\[if\s/i.test(comment) ||
						opened === -1 ||
						closes <= opened
					) {
						return;
					}

					const start = path.start() + opened + 2;
					const end = path.start() + closes;

					found.push({
						start,
						end,
						srcdoc: false,
						value: comment.slice(opened + 2, closes)
					});
				};
			}

			new SourceProcessor().use(visitors).process(source, {});
			// An element's attributes are visited where the element is, so the two
			// kinds do not arrive interleaved by position on their own.
			found.sort((a, b) => a.start - b.start);

			// Back to front, so an earlier splice does not move a later range.
			for (let i = found.length - 1; i >= 0; i--) {
				const { start, end, srcdoc, value } = found[i];
				// Sequential: a later splice must not move an earlier range.

				const inner = await minifyDocument(
					srcdoc ? decodeEntities(value, true) : value
				);
				let written = inner;

				if (srcdoc) {
					// A document is not something an unquoted value can hold — a space
					// or a `>` in it would end the attribute — so one written bare gets
					// quotes.
					const delimiter = source.charCodeAt(start - 1);
					const quoted = delimiter === 34 || delimiter === 39;
					const escaped = escapeAttribute(inner, quoted ? delimiter : 34, true);

					written = quoted ? escaped : `"${escaped}"`;
				}

				source = `${source.slice(0, start)}${written}${source.slice(end)}`;
			}
		}
		// `process` parses once, and with `mode: "minify"` its walk also prints the
		// safely minified serialization — no second parse. No `source` is named, so no
		// map is built: the HTML serialize is token-coarse and only the code is used.
		return printDocument(source);
	};
	const result = { code: await minifyDocument(code) };

	return reported.length === 0
		? result
		: { ...result, ...collectEmbeddedDiagnostics(reported) };
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
htmlMinify.supportsWorkerThreads = () => true;

/**
 * The language this minifies, for a caller dispatching source that carries no
 * filename — HTML a module embeds in a JavaScript string literal.
 * @returns {string[]} the languages
 */
htmlMinify.getTypes = () => ["html"];

/**
 * The languages this can offer a caller through `renderEmbeddedSource` — an
 * inline `<style>`, a `<script>`, an `<svg>` subtree and the document an
 * `<iframe srcdoc>` holds, less the one `minifySrcdoc` keeps to itself. A
 * `style=""` is not among them: how the attribute is written is decided by
 * reading the minified text back, so it stays with the built-in CSS minifier,
 * which is webpack's own `cssMinify`.
 * @param {{ minifySrcdoc?: boolean }=} minimizerOptions the options this will run with
 * @returns {string[]} the languages
 */
htmlMinify.getEmbeddedTypes = (minimizerOptions = {}) => {
	/** @type {string[]} */
	const languages =
		/** @type {typeof import("../index")} */
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, as the body does
		require(/** @type {string} */ ("webpack")).html.syntax.EMBEDDED_LANGUAGES;

	return minimizerOptions.minifySrcdoc
		? languages.filter((language) => language !== "html")
		: languages;
};

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
