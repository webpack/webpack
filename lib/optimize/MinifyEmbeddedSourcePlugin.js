/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { RawSource, SourceMapSource } = require("webpack-sources");
const CssModulesPlugin = require("../css/CssModulesPlugin");
const HtmlModulesPlugin = require("../html/HtmlModulesPlugin");
const memoize = require("../util/memoize");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../css/syntax").CssEnvironment} CssEnvironment */

const getCssSyntax = memoize(() => require("../css/syntax"));

const getHtmlSyntax = memoize(() => require("../html/syntax"));

const PLUGIN_NAME = "MinifyEmbeddedSourcePlugin";

/**
 * @typedef {object} MinifyEmbeddedSourcePluginOptions
 * @property {EXPECTED_OBJECT=} css minimizer options for CSS embedded in JS, or `undefined` to leave it alone
 * @property {EXPECTED_OBJECT=} html minimizer options for HTML embedded in JS, or `undefined` to leave it alone
 */

/**
 * Minifies the CSS and HTML that reach the bundle as JavaScript string literals
 * rather than as their own assets: every `exportType` but `"link"` embeds its
 * stylesheet, and an HTML module imported from JS embeds its markup. Neither is
 * an asset, so the minimizer plugin's filename filters cannot reach them, and
 * without this the same content ships minified or not depending only on how it
 * was routed.
 *
 * Both serializers are synchronous, so this runs inside module generation — no
 * worker pool, unlike terser.
 */
class MinifyEmbeddedSourcePlugin {
	/**
	 * @param {MinifyEmbeddedSourcePluginOptions} options options
	 */
	constructor(options) {
		/** @type {MinifyEmbeddedSourcePluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { css, html } = this.options;
		if (!css && !html) return;
		// Options reach the codegen cache key as text: they are plain data from
		// `optimization.minimize`, and a tap that varies must say so.
		const cssKey = css ? JSON.stringify(css) : "";
		const htmlKey = html ? JSON.stringify(html) : "";

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (css) {
				const hooks = CssModulesPlugin.getCompilationHooks(compilation);
				hooks.renderEmbeddedCss.tap(PLUGIN_NAME, (source, module) =>
					minifyCssSource(source, module, css)
				);
				hooks.embeddedCssHash.tap(PLUGIN_NAME, (hash) => {
					hash.update(cssKey);
				});
			}
			if (html) {
				const hooks = HtmlModulesPlugin.getCompilationHooks(compilation);
				hooks.renderEmbeddedHtml.tap(PLUGIN_NAME, (markup) => {
					const { SourceProcessor } = getHtmlSyntax();
					return new SourceProcessor().process(markup, {
						mode: "minify",
						...html
					}).code;
				});
				hooks.embeddedHtmlHash.tap(PLUGIN_NAME, (hash) => {
					hash.update(htmlKey);
				});
			}
		});
	}
}

/**
 * @param {Source} source the stylesheet about to become a JS string literal
 * @param {Module} module the module it belongs to
 * @param {EXPECTED_OBJECT} options minimizer options
 * @returns {Source} the minified source, or the original when nothing changed
 */
const minifyCssSource = (source, module, options) => {
	const { source: original, map: inputMap } = source.sourceAndMap();
	const text =
		typeof original === "string" ? original : original.toString("utf8");
	// The asset path names the map's input elsewhere; there is no asset here, so
	// the module does. `_nameMapSources` passes a non-`webpack://` name through.
	const name = module.identifier();
	const { SourceProcessor } = getCssSyntax();
	// A map is asked for only when the input already carried one. Introducing one
	// where there was none makes `_cssToJsLiteral` inline it as a base64 data URI,
	// which costs far more bytes than minifying saved; building one also walks the
	// whole output.
	const { code, map } = new SourceProcessor().process(
		text,
		inputMap
			? { mode: "minify", source: name, content: text, ...options }
			: { mode: "minify", ...options }
	);
	// Unchanged text keeps the source it came with, whose map is already right.
	if (code === text) return source;
	return inputMap
		? new SourceMapSource(code, name, map, text, inputMap, true)
		: new RawSource(code);
};

module.exports = MinifyEmbeddedSourcePlugin;
