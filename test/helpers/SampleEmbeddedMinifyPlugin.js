"use strict";

const { RawSource, SourceMapSource } = require("webpack-sources");
const CssModulesPlugin = require("../../lib/css/CssModulesPlugin");
const cssSyntax = require("../../lib/css/syntax");
const HtmlModulesPlugin = require("../../lib/html/HtmlModulesPlugin");
const htmlSyntax = require("../../lib/html/syntax");

/** @typedef {import("../../lib/Compiler")} Compiler */
/** @typedef {import("../../lib/Module")} Module */
/** @typedef {import("webpack-sources").Source} Source */

const PLUGIN_NAME = "SampleEmbeddedMinifyPlugin";

/**
 * Stands in for `minimizer-webpack-plugin`, which owns the real taps: webpack
 * ships `renderEmbeddedCss` / `renderEmbeddedHtml` but taps neither, so this is
 * what exercises them. Kept in `test/` on purpose — nothing here should grow
 * into a second implementation of the minifier.
 */
/**
 * @typedef {object} SampleEmbeddedMinifyPluginOptions
 * @property {boolean=} css tap the CSS hook
 * @property {boolean=} html tap the HTML hook
 * @property {object=} minimizerOptions options handed to the serializer
 */

class SampleEmbeddedMinifyPlugin {
	/**
	 * @param {SampleEmbeddedMinifyPluginOptions=} options options
	 */
	constructor({ css = true, html = true, minimizerOptions = {} } = {}) {
		this.options = { css, html, minimizerOptions };
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { css, html, minimizerOptions } = this.options;
		// Whatever a tap varies on has to reach the codegen cache key: module
		// hashes are taken before code generation, so the hook's own output cannot.
		const key = JSON.stringify(minimizerOptions);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (css) {
				const hooks = CssModulesPlugin.getCompilationHooks(compilation);
				hooks.renderEmbeddedCss.tap(PLUGIN_NAME, (source, module) =>
					minifyCss(source, module, minimizerOptions)
				);
				hooks.embeddedCssHash.tap(PLUGIN_NAME, (hash) => {
					hash.update(key);
				});
			}
			if (html) {
				const hooks = HtmlModulesPlugin.getCompilationHooks(compilation);
				hooks.renderEmbeddedHtml.tap(
					PLUGIN_NAME,
					(markup) =>
						new htmlSyntax.SourceProcessor().process(markup, {
							mode: "minify",
							...minimizerOptions
						}).code
				);
				hooks.embeddedHtmlHash.tap(PLUGIN_NAME, (hash) => {
					hash.update(key);
				});
			}
		});
	}
}

/**
 * @param {Source} source the stylesheet about to become a JS string literal
 * @param {Module} module the module it belongs to
 * @param {object} options serializer options
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
