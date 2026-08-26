/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @import { CssEnvironment, CssTransformOptions } from "./syntax" */

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
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {{ as?: "stylesheet" | "block-contents", environment?: CssEnvironment, convertLengthUnits?: boolean, rewriteCustomProperties?: boolean, renderEmbeddedSource?: AsyncEmbeddedSourceRenderer } & CssTransformOptions=} minimizerOptions minimizer options — `environment` carries the target's CSS abilities (see `output.environment`), so a spelling the target cannot read is not reached for; the rest is `optimization.minimize.css` (e.g. `convertLengthUnits`, and the per-transform switches). `renderEmbeddedSource` minifies source this stylesheet embeds, and may be asynchronous: one parse serves both it and the output
 * @returns {Promise<{ code: string, map?: SourceMap, warnings?: (Error | string)[], errors?: (Error | string)[] }>} the minified CSS, its input->output source map (one anchor for the whole of a `block-contents` print, which is emitted as one piece), and what a renderer reported over what this embeds
 */
const cssMinify = async (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO expose the remaining declined transforms on `optimization.minimize.css`
	// like `convertLengthUnits` — the switches below turn off what webpack does
	// make, not what it declines. Each is on in other minifiers; what each costs:
	// - dropping a declaration a later one overrides, which loses a fallback pair
	//   an engine that cannot read the newer spelling depends on;
	// - merging rules a third stands between, and merging non-adjacent `@media`,
	//   both of which reorder the cascade (csso loses ~12,900 Tailwind classes to
	//   it). Adjacent rules sharing a block do join, nothing being between them to
	//   step over — only where every selector is a shape each engine parses, since
	//   one it cannot invalidates the whole list and loses the rest with it;
	// - the color conversions webpack declines rather than guesses. Every polar and
	//   Lab function converts to hex, except two cases the other minifiers convert
	//   regardless: a channel landing near a `.5` boundary, where implementations
	//   round opposite ways (it is why esbuild and lightningcss emit different
	//   bytes for `hwb(194 0% 0%)`), and a Lab-family color outside the sRGB gamut,
	//   which hex would clip to a different color rather than respell.
	// Which longhand families merge into their shorthand is decided in
	// `tooling/generate-css-data.js`, and three kinds are excluded there for good
	// rather than pending an option:
	// - a shorthand gathering a whole family (`border`, `font`, `background`,
	//   `transition`, `flex`, `columns`) resets longhands `computed` does not
	//   name — `border` clears `border-image`, `font` clears `font-size-adjust` —
	//   so the merge would drop a declaration nothing in the family wrote. The
	//   ones checked against a browser and found to reset nothing else do merge
	//   (`FAMILY_LONGHANDS`), where each value parses back into its own slot;
	// - a shorthand materially newer than its longhands (`place-items`/`-content`
	//   /`-self`) would lose both declarations, not one, on a target reading only
	//   the longhands. `output.environment` states this for `inset` alone.
	//   `overflow` is newer only two values wide, so it merges when it collapses;
	// - a pair two shorthands both claim, which cannot be right for both. None
	//   today: `mdn-data` gave `corner-inline-start-shape` the block-start edge's
	//   corners, corrected in the generator to the pair Chromium computes.
	const {
		SourceProcessor,
		askEmbeddedRenderer,
		collectEmbeddedDiagnostics,
		embeddedText,
		pickTransforms
	} = webpack.css.syntax;
	const [[file, code]] = Object.entries(input);
	// `process` parses once, and with `mode: "minify"` the same walk also prints
	// the safely minified serialization — no second parse. Naming the input with
	// `source` / `content` is what asks for the map, which the plugin composes
	// back to the original source.
	const {
		as,
		environment,
		convertLengthUnits,
		rewriteCustomProperties,
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
		convertLengthUnits,
		rewriteCustomProperties,
		// The per-transform switches stand beside those rather than nested in
		// them, so a config names one the way it names `convertLengthUnits`;
		// `pickTransforms` is what knows which names those are.
		transforms: pickTransforms(minimizerOptions)
	};
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
	const result = await new SourceProcessor().processAsync(code, {
		...printOptions,
		renderEmbeddedSource: renderer
	});

	return reported.length === 0
		? result
		: { ...result, ...collectEmbeddedDiagnostics(reported) };
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
cssMinify.supportsWorkerThreads = () => true;

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
	).css.syntax.EMBEDDED_LANGUAGES
];

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims CSS, so terser (JS) and this can coexist in a single plugin / worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for CSS assets
 */
cssMinify.filter = (name) => /\.css(\?.*)?$/i.test(name);

module.exports = cssMinify;
