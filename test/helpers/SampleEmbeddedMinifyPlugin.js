"use strict";

const { RawSource, SourceMapSource } = require("webpack-sources");
const { CSS_TYPE, HTML_TYPE } = require("../../lib/ModuleSourceTypeConstants");
const cssSyntax = require("../../lib/css/syntax");
const htmlSyntax = require("../../lib/html/syntax");

/** @typedef {import("../../lib/Compiler")} Compiler */
/** @typedef {import("../../lib/Module")} Module */
/** @typedef {import("../../lib/util/SourceProcessor").EmbeddedSourceRenderer} EmbeddedSourceRenderer */
/** @typedef {import("webpack-sources").Source} Source */

const PLUGIN_NAME = "SampleEmbeddedMinifyPlugin";

/**
 * Stands in for `minimizer-webpack-plugin`, which owns the real taps: webpack
 * ships `renderEmbeddedSource` but taps it nowhere, so this is what
 * exercises it. Kept in `test/` on purpose — nothing here should grow
 * into a second implementation of the minifier.
 */
/**
 * @typedef {object} SampleEmbeddedMinifyPluginOptions
 * @property {boolean=} css tap the CSS hook
 * @property {boolean=} html tap the HTML hook
 * @property {EXPECTED_OBJECT=} minimizerOptions options handed to the serializer
 * @property {EmbeddedSourceRenderer=} renderEmbeddedSource renderer for what the HTML itself embeds — an inline `<style>` / `<script>`
 */

class SampleEmbeddedMinifyPlugin {
	/**
	 * @param {SampleEmbeddedMinifyPluginOptions=} options options
	 */
	constructor({
		css = true,
		html = true,
		minimizerOptions = {},
		renderEmbeddedSource
	} = {}) {
		this.options = { css, html, minimizerOptions, renderEmbeddedSource };
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { css, html, minimizerOptions, renderEmbeddedSource } = this.options;
		// Whatever a tap varies on has to reach the codegen cache key: module
		// hashes are taken before code generation, so the hook's own output cannot.
		const key = JSON.stringify(minimizerOptions);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// One tap for every language pair — `info.type` says which arrived, the
			// way `minimizer-webpack-plugin` already dispatches assets by filename.
			// Async on purpose: a real minifier may only be loadable that way.
			compilation.hooks.renderEmbeddedSource.tapPromise(
				PLUGIN_NAME,
				async (source, { type, module }) => {
					// Nothing here needs awaiting; the await is what proves webpack waits.
					await Promise.resolve();
					if (type === CSS_TYPE) {
						return css ? minifyCss(source, module, minimizerOptions) : source;
					}
					if (type === HTML_TYPE && html) {
						const markup = source.source();
						return new RawSource(
							new htmlSyntax.SourceProcessor().process(
								typeof markup === "string" ? markup : markup.toString("utf8"),
								{
									mode: "minify",
									// What the document itself embeds. Absent, the serializer
									// falls back to its own CSS and JSON minifiers.
									renderEmbeddedSource,
									...minimizerOptions
								}
							).code
						);
					}
					return source;
				}
			);
			compilation.hooks.embeddedSourceHash.tap(PLUGIN_NAME, (module, hash) => {
				hash.update(key);
			});
		});
	}
}

/**
 * @param {Source} source the stylesheet about to become a JS string literal
 * @param {Module} module the module it belongs to
 * @param {EXPECTED_OBJECT} options serializer options
 * @returns {Source} the minified source, or the original when nothing changed
 */
const minifyCss = (source, module, options) => {
	const { source: original, map: inputMap } = source.sourceAndMap();
	const text =
		typeof original === "string" ? original : original.toString("utf8");
	const name = module.identifier();
	// A map is asked for only when the input carried one: inventing one makes the
	// generator inline it as a base64 data URI, costing more than minifying saves.
	const { code, map } = new cssSyntax.SourceProcessor().process(
		text,
		inputMap
			? { mode: "minify", source: name, content: text, ...options }
			: { mode: "minify", ...options }
	);
	if (code === text) return source;
	return inputMap
		? new SourceMapSource(code, name, map, text, inputMap, true)
		: new RawSource(code);
};

module.exports = SampleEmbeddedMinifyPlugin;
