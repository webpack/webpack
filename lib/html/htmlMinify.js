/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { DeferredEmbeddedSource, HtmlPrintOptions } from "../html/syntax" */
/** @import { MinifyOptions as TerserOptions } from "terser" */

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
 * @param {Omit<HtmlPrintOptions, "renderEmbeddedSource" | "deferEmbeddedSource"> & { css?: { convertLengthUnits?: boolean, rewriteCustomProperties?: boolean, unusedSymbols?: string[], pseudoClasses?: { [name: string]: string } }, terserOptions?: TerserOptions, minifyConditionalComments?: boolean, renderEmbeddedSource?: AsyncEmbeddedSourceRenderer }=} minimizerOptions minimizer options — `environment` and `css` (`optimization.minimize.css`, whole) reach the CSS minifier this runs over inline CSS, `terserOptions` the JS minifier it runs over an inline `<script>`; the rest is `optimization.minimize.html`. The two stand apart rather than merged: both languages name a `quotes` and a `comments`, and one flat object would hand each the other's answer. `renderEmbeddedSource` minifies source this document embeds and may be asynchronous — one parse serves both it and the output. What it declines this minifies itself, for the languages webpack ships a minifier for
 * @returns {Promise<{ code: string, warnings?: (Error | string)[], errors?: (Error | string)[] }>} the minified HTML, and what a renderer reported over what it embeds
 */
const htmlMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO widen the value rewrites the switches below name: an enumerated
	// value the spec does not name.
	const {
		askEmbeddedRenderer,
		collectEmbeddedDiagnostics,
		embeddedText,
		SourceProcessor,
		NodeType,
		pickTransforms
	} = webpack.html.syntax;
	const [[, code]] = Object.entries(input);
	// The nested CSS minifier gets the abilities and options a `.css` asset
	// gets, or the inline copy of a declaration would disagree with it.
	const {
		environment,
		terserOptions = {},
		css = {},
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		removeRedundantAttributes,
		minifyConditionalComments,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags,
		renderEmbeddedSource
	} = minimizerOptions;
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
		cssUnusedSymbols: css.unusedSymbols,
		cssPseudoClasses: css.pseudoClasses,
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
	// A caller's renderer is asked first; whatever it declines this minifies
	// itself, for the languages webpack ships a minifier for.
	const renderer = async (
		/** @type {string} */ source,
		/** @type {EXPECTED_ANY} */ hole
	) => {
		if (renderEmbeddedSource !== undefined) {
			const answered = embeddedText(
				await askEmbeddedRenderer(renderEmbeddedSource, hole, reported)
			);

			if (typeof answered === "string") return answered;
		}

		// A nested document is a document, so it is minified the same way. The
		// built-in CSS and JSON minifiers already reach every other body.
		return hole.type === "html" ? minifyDocument(source) : undefined;
	};
	// A module goes before the caller's renderer, which is handed a language and
	// so has no goal to read one with; a classic script still goes to it.
	const renderJs = async (
		/** @type {string} */ source,
		/** @type {EXPECTED_ANY} */ hole
	) =>
		hole.type === "javascript" && hole.as === "module"
			? minifyScript(source)
			: renderer(source, hole);
	/**
	 * Minify one inline `<script type=module>` body with the function that
	 * minifies this build's JavaScript assets, so the two are held to the same
	 * options. A body it cannot parse is declined, which keeps it as written.
	 * @param {string} source the script body
	 * @returns {Promise<string | undefined>} the minified body, or undefined
	 */
	const minifyScript = async (source) => {
		// Resolved in the worker like `webpack` above — it is the plugin running.

		const { terserMinify } = require("minimizer-webpack-plugin");

		const { format, output, ...rest } = terserOptions;

		try {
			const { code: minified } = await terserMinify(
				{ "inline.js": source },
				undefined,
				{
					...rest,
					// The parse goal this is reached for. A module's top level is its
					// own scope, so what nothing exports or reaches may go.
					module: true,
					// A `</script>` the body spells would end the element early.
					// eslint-disable-next-line camelcase -- terser's own option name
					format: { ...(format || output), inline_script: true }
				},
				false
			);

			return minified;
		} catch (_err) {
			// Not JavaScript after all — a template, or a placeholder a later step
			// fills in. Leaving it as written is what an untapped run would do.
			return undefined;
		}
	};
	/**
	 * @param {string} text a whole document
	 * @returns {Promise<string>} the same document, printed
	 */
	const printDocument = async (text) =>
		(
			await new SourceProcessor().processAsync(text, {
				...printOptions,
				renderEmbeddedSource: renderJs
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
		// A conditional comment's body is markup this parse cannot start a second
		// one over, so each is located in a walk and spliced afterwards.
		const wantsConditional =
			Boolean(minifyConditionalComments) && /<!--\[if\s/i.test(source);

		if (wantsConditional) {
			/** @type {{ start: number, end: number, value: string }[]} */
			const found = [];
			/** @type {{ [type: number]: (path: EXPECTED_ANY) => void }} */
			const visitors = {};

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
					value: comment.slice(opened + 2, closes)
				});
			};

			new SourceProcessor().use(visitors).process(source, {});

			// Back to front, so an earlier splice does not move a later range.
			for (let i = found.length - 1; i >= 0; i--) {
				const { start, end, value } = found[i];
				// Sequential: a later splice must not move an earlier range.
				const inner = await minifyDocument(value);

				source = `${source.slice(0, start)}${inner}${source.slice(end)}`;
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
 * `<iframe srcdoc>` holds. A `style=""` is not among them: how the attribute is
 * written is decided by reading the minified text back, so it stays with the
 * built-in CSS minifier, which is webpack's own `cssMinify`.
 * @returns {string[]} the languages
 */
htmlMinify.getEmbeddedTypes = () => {
	/** @type {string[]} */
	const languages =
		/** @type {typeof import("../index")} */
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, as the body does
		require(/** @type {string} */ ("webpack")).html.syntax.EMBEDDED_LANGUAGES;

	return languages;
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
