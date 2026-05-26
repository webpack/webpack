"use strict";

// Mirrors the bug class reported in html-webpack-plugin#1814: the HTML that
// extraction emits references hashed JS/CSS/asset URLs, and those URLs must
// keep agreeing with the actual emitted filenames. This exercise covers
// every hash placeholder webpack supports for each "...filename" /
// "...chunkFilename" output option — JS, CSS, HTML, and asset modules —
// with `optimization.realContentHash` toggled both on and off. Each config
// index gets its own `cfg${i}/` sub-tree so multiple variants can share a
// single `options.output.path` without colliding.

/** @typedef {import("../../../../").Configuration} Configuration */

// Which placeholders apply where (and why):
//
// - JS/CSS chunk-bound outputs (`filename`, `chunkFilename`, `cssFilename`,
//   `cssChunkFilename`) → all of `[fullhash]`, `[chunkhash]`, `[contenthash]`
//   resolve because a chunk is in scope during emit.
// - HTML module outputs (`htmlFilename`, `htmlChunkFilename`) → `[fullhash]`
//   and `[contenthash]` resolve. `[chunkhash]` isn't meaningful because a
//   single HTML module isn't owned by one chunk — `HtmlModulesPlugin`
//   deliberately omits `chunk` from the path data.
// - `assetModuleFilename` → only `[contenthash]` resolves. Asset filenames
//   are computed by `AssetGenerator.getFilenameWithInfo` during module code
//   generation, before the compilation hash is known, so `[fullhash]` would
//   be left as a literal placeholder on disk — and `[chunkhash]` doesn't
//   apply for the same reason as HTML modules. We pin asset filenames to
//   `[contenthash]` in every variant.

/**
 * @param {number} i config index
 * @param {string} chunkPlaceholder placeholder used for chunk-bound outputs
 * @param {string} htmlPlaceholder placeholder used for HTML module outputs
 * @param {boolean} realContentHash whether `optimization.realContentHash` is on
 * @returns {Configuration} configuration
 */
const make = (i, chunkPlaceholder, htmlPlaceholder, realContentHash) => ({
	target: "web",
	output: {
		filename: `cfg${i}/bundle.[name].${chunkPlaceholder}.js`,
		chunkFilename: `cfg${i}/async.[name].${chunkPlaceholder}.js`,
		cssFilename: `cfg${i}/bundle.[name].${chunkPlaceholder}.css`,
		cssChunkFilename: `cfg${i}/async.[name].${chunkPlaceholder}.css`,
		htmlFilename: `cfg${i}/[name].${htmlPlaceholder}.html`,
		htmlChunkFilename: `cfg${i}/[name].${htmlPlaceholder}.html`,
		assetModuleFilename: `cfg${i}/[name].[contenthash][ext]`
	},
	optimization: {
		realContentHash,
		chunkIds: "named"
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true,
		css: true
	}
});

/** @type {Configuration[]} */
module.exports = [
	// [contenthash] is the placeholder most users reach for, and the one that
	// `realContentHash` actually rewrites after final content is known. The
	// html-webpack-plugin#1814 scenario lives here: chunks reference assets
	// (and HTML references chunks) by their `[contenthash]`, and we want
	// those references to keep matching the emitted filenames.
	make(0, "[contenthash]", "[contenthash]", true),
	make(1, "[contenthash]", "[contenthash]", false),
	// [chunkhash] for the chunk-bound outputs; HTML falls back to
	// [contenthash] because HTML modules aren't tied to a single chunk.
	make(2, "[chunkhash]", "[contenthash]", true),
	make(3, "[chunkhash]", "[contenthash]", false),
	// [fullhash] is the compilation-wide hash — the same string in every
	// filename within one compile. Verifies the placeholder is accepted and
	// substituted everywhere it's supposed to resolve (JS/CSS/HTML).
	make(4, "[fullhash]", "[fullhash]", true),
	make(5, "[fullhash]", "[fullhash]", false)
];
