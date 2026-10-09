/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { HtmlPrintOptions } from "../html/syntax-printer" */
/** @import { CssEnvironment } from "../css/syntax-parser" */

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
/** @typedef {import("../util/extractComments").PluginExtractComments} ExtractCommentsOption */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationMinimizeExtractComments} MinimizeExtractComments */

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
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: safe serialize keeps positions token-coarse, so no map is produced yet)
 * @param {Omit<HtmlPrintOptions, "renderEmbeddedSource" | "deferEmbeddedSource"> & { environment?: CssEnvironment, css?: { convertLengthUnits?: boolean, convertApproximateColors?: boolean, dropOverriddenDeclarations?: boolean, rewriteCustomProperties?: boolean, unusedSymbols?: string[], pseudoClasses?: { [name: string]: string } }, minifyConditionalComments?: boolean, extractComments?: MinimizeExtractComments, renderEmbeddedSource?: AsyncEmbeddedSourceRenderer, svg?: boolean }=} minimizerOptions minimizer options — `environment` and `css` (`optimization.minimize.css`, whole) reach the CSS minifier this runs over inline CSS; the rest is `optimization.minimize.html`. The two stand apart rather than merged: both languages name a `quotes` and a `comments`, and one flat object would hand each the other's answer. `renderEmbeddedSource` minifies source this document embeds and may be asynchronous — one parse serves both it and the output. What it declines this minifies itself, for the languages webpack ships a minifier for, SVG `data:` URLs among them when `svg` is set
 * @param {ExtractCommentsOption=} extractComments the plugin's `extractComments`, read where `minimize.html.extractComments` is not set
 * @returns {Promise<{ code: string, extractedComments?: string[], warnings?: (Error | string)[], errors?: (Error | string)[] }>} the minified HTML, the comments taken out of it, and what a renderer reported over what it embeds
 */
const htmlMinify = async (
	input,
	sourceMap,
	minimizerOptions = {},
	extractComments = undefined
) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	const { SourceProcessor, parser } = webpack.html.syntax;
	const { NodeType, pickTransforms } = parser;
	const { builtinEmbeddedRenderer } = webpack.html;
	const { askEmbeddedRenderer, collectEmbeddedDiagnostics, embeddedText } =
		webpack.util.dataURL;
	const [[, given]] = Object.entries(input);
	// The plugin hands a text minifier a string; the type admits an image's bytes.
	const code = typeof given === "string" ? given : given.toString("utf8");
	// The nested CSS minifier gets the abilities and options a `.css` asset
	// gets, or the inline copy of a declaration would disagree with it.
	const {
		environment,
		css = {},
		collapseWhitespace,
		mergeStyles,
		mergeScripts,
		removeEmptyAttributes,
		removeEmptyElements,
		removeRedundantAttributes,
		minifyConditionalComments,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags,
		renderEmbeddedSource,
		svg
	} = minimizerOptions;
	// One list for the whole run: a nested document reaches this same collector,
	// so what a renderer reports inside an `<iframe srcdoc>` is reported once at
	// the top rather than lost at the level that heard it.
	/** @type {EmbeddedSourceResult[]} */
	const reported = [];
	// Webpack's own renderer, handed the CSS minifier's options so an inline
	// declaration agrees with the `.css` asset; each language picks its switches.
	const builtin = builtinEmbeddedRenderer({
		environment,
		convertLengthUnits: css.convertLengthUnits,
		convertApproximateColors: css.convertApproximateColors,
		dropOverriddenDeclarations: css.dropOverriddenDeclarations,
		rewriteCustomProperties: css.rewriteCustomProperties,
		unusedSymbols: css.unusedSymbols,
		pseudoClasses: css.pseudoClasses,
		transforms: webpack.css.syntax.parser.pickTransforms(css),
		svg
	});
	// One set of options, handed to the document pass and to each conditional
	// comment's body below.
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(minimizerOptions),
		collapseWhitespace,
		mergeStyles,
		mergeScripts,
		removeEmptyAttributes,
		removeEmptyElements,
		removeRedundantAttributes,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags
	};
	// Handed each body the print offers, keeping what it reported: the element or
	// attribute around one is written from that answer, and a body declined or
	// thrown on is spelled as an untapped run spells it.

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

		// Webpack's own answers for what the caller's left: CSS and JSON, and a
		// nested document, which is a document minified the same way.
		const own = builtin(source, hole);
		if (own !== undefined) return own;
		return hole.type === "html" ? minifyDocument(source) : undefined;
	};
	/**
	 * @param {string} text a whole document
	 * @param {typeof printOptions} options the print's options
	 * @returns {Promise<string>} the same document, printed
	 */
	const printDocument = async (text, options) => {
		// The built-in renderer is synchronous, so with no caller's renderer only
		// a nested document needs the async pass — an `<iframe srcdoc>` or a
		// `data:` URL naming HTML, or SVG with `svg`; with none spelled, none is there.
		if (
			renderEmbeddedSource === undefined &&
			!(svg ? /srcdoc|data:[^,]*(?:html|svg)/i : /srcdoc|data:[^,]*html/i).test(
				text
			)
		) {
			return new SourceProcessor().process(text, {
				...options,
				renderEmbeddedSource: builtin
			}).code;
		}
		return (
			await new SourceProcessor().processAsync(text, {
				...options,
				renderEmbeddedSource: renderer
			})
		).code;
	};

	// Recursion goes through this local name, never the module's own: the plugin
	// ships this function to its workers as source, where that binding is absent.

	// A marker cannot cross a parse, the preprocessor turning its NUL into U+FFFD,
	// so each nested document is finished before it is spliced in.
	/**
	 * @param {string} text a whole document
	 * @param {typeof printOptions=} options the print's options, the asset's own for the outermost document
	 * @returns {Promise<string>} the same document, minified
	 */
	const minifyDocument = async (text, options = printOptions) => {
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
		return printDocument(source, options);
	};
	// Only the asset's own document gives comments up: a nested one keeps them,
	// as an inline `<style>` does, and its places are not the asset's.
	const extraction = webpack.util.extractComments.extractComments(
		minimizerOptions.extractComments === undefined
			? extractComments
			: minimizerOptions.extractComments,
		printOptions.transforms === undefined
			? undefined
			: printOptions.transforms.comments,
		{
			open: "<!--",
			close: "-->",
			// Every comment the HTML minifier reaches here is inert.
			some: () => false,
			unstated: () => false
		}
	);
	const result = {
		code: await minifyDocument(
			code,
			extraction === undefined
				? printOptions
				: {
						...printOptions,
						transforms: {
							...printOptions.transforms,
							comments: /** @type {(comment: string) => boolean} */ (
								extraction.comments
							)
						}
					}
		)
	};
	const answer =
		extraction === undefined || extraction.extracted.length === 0
			? result
			: { ...result, extractedComments: extraction.extracted };

	return reported.length === 0
		? answer
		: { ...answer, ...collectEmbeddedDiagnostics(reported) };
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside jsMinify.
htmlMinify.supportsWorkerThreads = () => true;

/**
 * The language this minifies, for a caller dispatching source that carries no
 * filename — HTML a module embeds in a JavaScript string literal.
 * @returns {string[]} the languages
 */
htmlMinify.getTypes = () => ["html"];

/**
 * The languages this can offer a caller through `renderEmbeddedSource` — an
 * inline `<style>`, a `<script>`, every event handler attribute (as the
 * function body it is), an `<svg>` subtree and the document an
 * `<iframe srcdoc>` holds, and every `style=""` as the block's contents it is.
 * @returns {string[]} the languages
 */
htmlMinify.getEmbeddedTypes = () => [
	// A copy of the shared list, as `cssMinify` makes one. Read from there and
	// not off the parser, which the minimizer would then load — 1.9 MB — to
	// answer this for a build holding no HTML at all.
	.../** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, as the body does
		require(/** @type {string} */ ("webpack"))
	).util.dataURL.EMBEDDED_LANGUAGES
];

// Sharing one `minimizer-webpack-plugin` instance, each asset reaches only the
// minify functions whose `filter` accepts it. This claims HTML, so jsMinify and
// cssMinify coexist with it in one worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for HTML assets
 */
htmlMinify.filter = (name) => /^[^?#]*\.html(?:[?#].*)?$/i.test(name);

/**
 * The comment the minimizer plugin writes its `extractComments` banner as: a
 * `/*!` line would be text in the document.
 * @param {string} banner the banner's text
 * @returns {string} the banner as an HTML comment
 */
htmlMinify.formatBanner = (banner) => `<!-- ${banner} -->`;

/**
 * Where the minimizer plugin puts its `extractComments` banner: at the end, so
 * the doctype stays first for an engine that reads anything before it oddly.
 * @returns {"end"} the position
 */
htmlMinify.getBannerPosition = () => /** @type {const} */ ("end");

module.exports = htmlMinify;
