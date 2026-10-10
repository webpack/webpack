/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { CssEnvironment, CssTransformOptions } from "./syntax-parser" */

/**
 * What a renderer made of one embedded body: the minified text, and anything it
 * has to report about it. A bare string is the text alone.
 * @typedef {{ code?: string, warnings?: (Error | string)[], errors?: (Error | string)[] }} EmbeddedSourceResult
 */

/**
 * Minifies source a stylesheet embeds; may answer asynchronously.
 * @typedef {(source: string, info: { type: string, hostType: string }) => Promise<string | EmbeddedSourceResult | undefined> | string | EmbeddedSourceResult | undefined} AsyncEmbeddedSourceRenderer
 */
/** @import { SourceMap } from "../util/SourceProcessor" */
/** @typedef {import("../util/extractComments").PluginExtractComments} ExtractCommentsOption */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationMinimizeExtractComments} MinimizeExtractComments */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one CSS asset's minimized form (collapse
 * whitespace, drop redundant separators and empty rules, shorten colors /
 * numbers / easing functions / identifier escapes, normalize string and `url()`
 * quoting, keep custom-property values verbatim unless asked otherwise), so CSS minification reuses
 * that plugin's pipeline — source maps, caching and worker-thread parallelization.
 *
 * The parser is read from the public `webpack.css.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {{ as?: "stylesheet" | "block-contents", environment?: CssEnvironment, convertLengthUnits?: boolean, convertApproximateColors?: boolean, dropOverriddenDeclarations?: boolean, extractComments?: MinimizeExtractComments, mergeDistantRules?: boolean, rewriteCustomProperties?: boolean, unusedSymbols?: string[], pseudoClasses?: { [name: string]: string }, renderEmbeddedSource?: AsyncEmbeddedSourceRenderer } & CssTransformOptions=} minimizerOptions minimizer options — `environment` carries the target's CSS abilities (see `output.environment`), so a spelling the target cannot read is not reached for; the rest is `optimization.minimize.css` (e.g. `convertLengthUnits`, and the per-transform switches). `renderEmbeddedSource` minifies source this stylesheet embeds, and may be asynchronous: one parse serves both it and the output. Its `extractComments` decides which comments move into a separate file, over the plugin's
 * @param {ExtractCommentsOption=} extractComments the plugin's `extractComments`, read where `minimize.css.extractComments` is not set
 * @returns {Promise<{ code: string, map?: SourceMap, extractedComments?: string[], warnings?: (Error | string)[], errors?: (Error | string)[] }>} the minified CSS, its input->output source map (one anchor for the whole of a `block-contents` print, which is emitted as one piece), the comments taken out of it, and what a renderer reported over what this embeds
 */
const cssMinify = async (
	input,
	sourceMap,
	minimizerOptions = {},
	extractComments = undefined
) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// WHY: each transform webpack declines, or asks for rather than assumes, is on
	// unconditionally in other minifiers, and each costs something measured.
	// - Dropping a declaration a later one overrides loses a fallback pair an
	//   engine that cannot read the newer spelling depends on, so it waits for
	//   `dropOverriddenDeclarations`.
	// - Merging rules a third stands between, and merging two blocks of one
	//   condition, both reorder the cascade (csso loses ~12,900 Tailwind classes
	//   to doing it without asking), so both wait for `mergeDistantRules`.
	//   Adjacent rules sharing a block do join, nothing being between them to step
	//   over — only where every selector is a shape each engine parses, since one
	//   it cannot invalidates the whole list and loses the rest with it.
	// - The two declined color conversions are `convertApproximateColors`, off
	//   until asked for: a channel landing near a `.5` boundary, where
	//   implementations round opposite ways (which is why esbuild and lightningcss
	//   emit different bytes for `hwb(194 0% 0%)`), and a Lab-family color outside
	//   the sRGB gamut, which hex clips rather than respells.

	// WHY: which longhand families merge into their shorthand is decided in
	// `tooling/generate-css-data.js`, where three kinds are excluded for good
	// rather than pending an option.
	// - A shorthand gathering a whole family (`border`, `font`, `background`,
	//   `transition`, `flex`, `columns`) resets longhands `computed` does not
	//   name — `border` clears `border-image`, `font` clears `font-size-adjust` —
	//   so the merge would drop a declaration nothing in the family wrote. The ones
	//   checked against a browser and found to reset nothing else do merge
	//   (`FAMILY_LONGHANDS`), where each value parses back into its own slot.
	// - A shorthand materially newer than its longhands (`place-items`/`-content`
	//   /`-self`) would lose both declarations, not one, on a target reading only
	//   the longhands. `output.environment` states this for `inset` alone, and
	//   `overflow` is newer only two values wide, so it merges when it collapses.
	// - A pair two shorthands both claim, which cannot be right for both. None
	//   today: `mdn-data` gave `corner-inline-start-shape` the block-start edge's
	//   corners, corrected in the generator to the pair Chromium computes.

	/**
	 * Whether a string in minified CSS holds a hex escape of a non-ASCII
	 * character below U+10000, the escapes `writeCharacters` writes out.
	 * @param {string} css the minified stylesheet
	 * @returns {boolean} true when it holds one
	 */
	const escapesCharacter = (css) => {
		let quote = 0;
		for (let i = 0; i < css.length; i++) {
			const c = css.charCodeAt(i);
			if (quote === 0) {
				if (c === 34 || c === 39) {
					quote = c;
				} else if (c === 47 && css.charCodeAt(i + 1) === 42) {
					const end = css.indexOf("*/", i + 2);
					if (end === -1) return false;
					i = end + 1;
				}
			} else if (c === quote) {
				quote = 0;
			} else if (c === 92) {
				const hex = /^[\da-f]{1,6}/i.exec(css.slice(i + 1, i + 7));
				if (hex === null) {
					i++;
				} else {
					const point = Number.parseInt(hex[0], 16);
					if (point > 0x7f && point <= 0xffff) return true;
					i += hex[0].length;
				}
			}
		}
		return false;
	};
	const { SourceProcessor, parser } = webpack.css.syntax;
	const { pickTransforms } = parser;
	const { askEmbeddedRenderer, collectEmbeddedDiagnostics, embeddedText } =
		webpack.util.dataURL;
	const [[file, given]] = Object.entries(input);
	// The plugin hands a text minifier a string; the type admits an image's bytes.
	const code = typeof given === "string" ? given : given.toString("utf8");
	// `process` parses once, and under `mode: "minify"` the same walk prints the
	// minified serialization too. Naming the input with `source` or `content` is
	// what asks for the map the plugin composes back to the original.
	const {
		as,
		environment,
		convertLengthUnits,
		convertApproximateColors,
		dropOverriddenDeclarations,
		mergeDistantRules,
		rewriteCustomProperties,
		unusedSymbols,
		pseudoClasses,
		renderEmbeddedSource
	} = minimizerOptions;
	// One set of options, handed to the print. `as` names the production: a
	// stylesheet, or the declaration list an HTML `style=""` holds — the printer
	// composes that list the same way it composes a rule's block.
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		as,
		source: file,
		content: code,
		environment,
		// A file of its own reads `@charset`; the declarations of a `style=""` are
		// read in the document's encoding, and have no opening bytes to hold one.
		declareCharset: as !== "block-contents",
		convertLengthUnits,
		convertApproximateColors,
		dropOverriddenDeclarations,
		mergeDistantRules,
		rewriteCustomProperties,
		unusedSymbols,
		pseudoClasses,
		// The per-transform switches stand beside those rather than nested in
		// them, so a config names one the way it names `convertLengthUnits`;
		// `pickTransforms` is what knows which names those are.
		transforms: pickTransforms(minimizerOptions)
	};
	const extraction = webpack.util.extractComments.extractComments(
		minimizerOptions.extractComments === undefined
			? extractComments
			: minimizerOptions.extractComments,
		printOptions.transforms === undefined
			? undefined
			: printOptions.transforms.comments,
		{
			open: "/*",
			close: "*/",
			some: (comment) => /^!|@(?:license|preserve)/i.test(comment),
			// A `/*#` pragma names the source's own map, which the minified text no
			// longer matches, so it goes with the other comments.
			unstated: () => false
		}
	);
	if (extraction !== undefined) {
		printOptions.transforms = {
			...printOptions.transforms,
			comments: /** @type {(comment: string) => boolean} */ (
				extraction.comments
			)
		};
	}
	/** @type {EmbeddedSourceResult[]} */
	const reported = [];
	// Handed each body the print offers, with what it reported kept: `processAsync`
	// spells the `url()` around one from the answer, and prints an untapped run's
	// spelling for a body declined or thrown on.
	const renderer =
		renderEmbeddedSource === undefined
			? undefined
			: (/** @type {string} */ _source, /** @type {EXPECTED_ANY} */ hole) =>
					askEmbeddedRenderer(renderEmbeddedSource, hole, reported).then(
						embeddedText
					);
	let result = await new SourceProcessor().processAsync(code, {
		...printOptions,
		renderEmbeddedSource: renderer
	});
	// An escape costs its bytes once per use, so a stylesheet repeating many, an
	// icon font's, can compress smaller with the characters written instead.
	if (printOptions.declareCharset && escapesCharacter(result.code)) {
		const extracted =
			extraction === undefined ? 0 : extraction.extracted.length;
		const rendered = reported.length;
		const written = await new SourceProcessor().processAsync(code, {
			...printOptions,
			writeCharacters: true,
			renderEmbeddedSource: renderer
		});

		const { gzipSync } = require("zlib");

		const keep =
			gzipSync(written.code, { level: 9 }).length <
			gzipSync(result.code, { level: 9 }).length;
		if (keep) result = written;
		// Both prints read one source, so both extract and render the same: the
		// first one's account stands for whichever is kept.
		if (extraction !== undefined) extraction.extracted.length = extracted;
		reported.length = rendered;
	}

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
cssMinify.supportsWorkerThreads = () => true;

/**
 * Where the minimizer plugin puts its `extractComments` banner: at the end, so
 * a `@charset` the print opens with stays the stylesheet's opening bytes.
 * @returns {"end"} the position
 */
cssMinify.getBannerPosition = () => /** @type {const} */ ("end");

/**
 * The language this minifies, for a caller dispatching source that carries no
 * filename — CSS a module embeds in a JavaScript string literal.
 * @returns {string[]} the languages
 */
cssMinify.getTypes = () => ["css"];

/**
 * The languages this can offer a caller through `renderEmbeddedSource` — what a
 * `url()` `data:` payload's media type may name.
 * @returns {string[]} the languages
 */
cssMinify.getEmbeddedTypes = () => [
	// A copy: the list is one module-level array, and what a caller does with what
	// it is handed is not this module's to bound. `htmlMinify` copies too.
	.../** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, as the body does
		require(/** @type {string} */ ("webpack"))
	).util.dataURL.EMBEDDED_LANGUAGES
];

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims CSS, so jsMinify and this can coexist in a single plugin / worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for CSS assets
 */
cssMinify.filter = (name) => /^[^?#]*\.css(?:[?#].*)?$/i.test(name);

module.exports = cssMinify;
