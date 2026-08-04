/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("./syntax").CssEnvironment} CssEnvironment */
/** @typedef {import("../util/SourceProcessor").SourceMap} SourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one CSS asset's minimized form (collapse
 * whitespace, drop redundant separators and empty rules, shorten colors /
 * numbers / easing functions / identifier escapes, normalize string and `url()`
 * quoting, keep custom-property values verbatim), so CSS minification reuses
 * that plugin's pipeline — source maps, caching and worker-thread parallelization.
 *
 * The parser is read from the public `webpack.css.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {object=} minimizerOptions minimizer options — `environment` carries the target's CSS abilities (see `output.environment`), so a spelling the target cannot read is not reached for
 * @returns {{ code: string, map: SourceMap }} the minified CSS and its input->output source map
 */
const cssMinify = (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO expose the transforms webpack declines as options, each off by
	// default. Every one is something csso, cssnano, lightningcss or esbuild ships
	// on, and every one costs something a build may not want to pay:
	// - custom-property rewrites (`--r:0.5rem` -> `.5rem`), observable through
	//   `getComputedStyle().getPropertyValue()`, the one place a declaration's
	//   authored text survives;
	// - dropping a declaration a later one overrides, which loses a fallback pair
	//   an engine that cannot read the newer spelling depends on;
	// - merging rules that share a block, and merging non-adjacent `@media`, both
	//   of which reorder the cascade (csso loses ~12,900 Tailwind classes to it);
	// - rewriting a length into a shorter unit it is exactly equal in
	//   (`convertLengthUnits`). It is sound — CSS Values 4 fixes the absolute
	//   units against each other, so `1pc` is `16px` on every medium — but it
	//   fires ten times in all of Bootstrap and once in a Tailwind build, and
	//   after gzip it costs as many bytes as it saves. `cssnano` disables the
	//   same rewrite in its default preset. `ms` <-> `s` is not gated;
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
	const { SourceProcessor } = webpack.css.syntax;
	const [[file, code]] = Object.entries(input);
	// `process` parses once, and with `minimize` the same walk also prints the
	// safely minified serialization — no second parse — and always returns
	// `{ code, map }`. `source` / `content` name the map so the plugin can compose
	// it back to the original source.
	return new SourceProcessor().process(code, {
		minimize: true,
		source: file,
		content: code,
		environment: /** @type {{ environment?: CssEnvironment }} */ (
			minimizerOptions
		).environment
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
