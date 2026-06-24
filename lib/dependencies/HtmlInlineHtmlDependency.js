/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { HTML_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../util/Hash")} Hash */

// One pass over the source: each char is replaced once and replacements aren't
// re-scanned, so this matches the `&`-first sequential escape chain exactly.
const ATTR_ESCAPE_REGEXP = /[&"']/g;
/** @type {Record<string, string>} */
const ATTR_ESCAPES = { "&": "&amp;", '"': "&quot;", "'": "&#39;" };
/**
 * @param {string} c matched character
 * @returns {string} the HTML-attribute-escaped entity
 */
const escapeAttrChar = (c) => ATTR_ESCAPES[c];

/**
 * Represents an `<iframe srcdoc="...">` attribute — an entity-encoded HTML
 * document. The decoded document is fed back through webpack's HTML pipeline as
 * a virtual `data:text/html` module so its asset URLs resolve relative to the
 * host HTML file. At render time the attribute value is replaced with the
 * processed HTML read from the nested module's `html` code-generation data,
 * re-escaped so the surrounding attribute stays valid.
 */
class HtmlInlineHtmlDependency extends ModuleDependency {
	/**
	 * @param {string} request virtual request resolving to the inline HTML (data URI)
	 * @param {Range} range range of the `srcdoc` attribute value
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "html inline html";
	}

	get category() {
		return "html-srcdoc";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// Recurse so the inline HTML's transitive deps (assets) propagate up.
		// The module is guaranteed — it is registered as a code-generation dependency.
		const module = /** @type {Module} */ (
			context.chunkGraph.moduleGraph.getModule(this)
		);
		module.updateHash(hash, context);
	}
}

HtmlInlineHtmlDependency.Template = class HtmlInlineHtmlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { moduleGraph, runtime, codeGenerationResults }) {
		const dep = /** @type {HtmlInlineHtmlDependency} */ (dependency);
		// The module is guaranteed — it is registered as a code-generation dependency.
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));
		const codeGen =
			/** @type {CodeGenerationResults} */
			(codeGenerationResults).get(module, runtime);
		const htmlSource = codeGen.sources.get(HTML_TYPE);

		// The attribute value was entity-decoded before parsing, so re-escape the
		// processed HTML to keep the surrounding `srcdoc="..."` attribute valid.
		const htmlText = (
			htmlSource ? /** @type {string} */ (htmlSource.source()) : ""
		).replace(ATTR_ESCAPE_REGEXP, escapeAttrChar);

		source.replace(dep.range[0], dep.range[1] - 1, htmlText);
	}
};

makeSerializable(
	HtmlInlineHtmlDependency,
	"webpack/lib/dependencies/HtmlInlineHtmlDependency"
);

module.exports = HtmlInlineHtmlDependency;
