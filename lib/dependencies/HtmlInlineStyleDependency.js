/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { CSS_TEXT_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<boolean[]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<boolean[]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const TRAILING_WHITESPACE_REGEXP = /\s+$/;
// One pass over the source: each char is replaced once and replacements aren't
// re-scanned, so this matches the `&`-first sequential escape chain exactly
// while avoiding two extra full-string scans + intermediate strings.
const ATTR_ESCAPE_REGEXP = /[&"']/g;
/** @type {Record<string, string>} */
const ATTR_ESCAPES = { "&": "&amp;", '"': "&quot;", "'": "&#39;" };
/**
 * @param {string} c matched character
 * @returns {string} the HTML-attribute-escaped entity
 */
const escapeAttrChar = (c) => ATTR_ESCAPES[c];

/**
 * Represents inline CSS in an HTML module — either a `<style>...</style>`
 * block (a stylesheet) or an element's `style="..."` attribute (a CSS
 * block's contents). The content is fed into webpack's CSS pipeline as a
 * virtual CSS module with `exportType: "text"` so `url()` and `\@import`
 * references are resolved relative to the HTML file. At render time the
 * original content range is replaced with the processed CSS text read from
 * the CSS module's code generation data.
 */
class HtmlInlineStyleDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlInlineStyleDependency.
	 * @param {string} request virtual request resolving to the inline CSS (data URI)
	 * @param {Range} range range of the inline CSS content (between `<style>` and `</style>`, or the `style` attribute value)
	 * @param {boolean=} attribute true when the source is a `style="..."` attribute (a block's contents) rather than a `<style>` block (stylesheet)
	 * @param {boolean=} inAttribute true when the range is an attribute value (decoded on parse, so the processed CSS must be re-escaped on write-back); defaults to `attribute` — differs only for attribute values parsed as full stylesheets
	 */
	constructor(request, range, attribute = false, inAttribute = attribute) {
		super(request);
		this.range = range;
		/** @type {boolean} */
		this.attribute = attribute;
		/** @type {boolean} */
		this.inAttribute = inAttribute;
	}

	get type() {
		return "html inline style";
	}

	get category() {
		return this.attribute ? "html-style-attribute" : "html-style";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// Recurse so the inline CSS's transitive deps (e.g. `url(asset)`) propagate up.
		const { chunkGraph } = context;
		const module = chunkGraph.moduleGraph.getModule(this);
		if (!module) return;
		module.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		super.serialize(context);
		context.write(this.attribute);
		context.write(this.inAttribute);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
		this.attribute = context.read();
		this.inAttribute = context.read();
	}
}

HtmlInlineStyleDependency.Template = class HtmlInlineStyleDependencyTemplate extends (
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
		const dep = /** @type {HtmlInlineStyleDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));

		/** @type {string} */
		let cssText = "";

		if (module) {
			const codeGen =
				/** @type {CodeGenerationResults} */
				(codeGenerationResults).get(module, runtime);
			const cssTextSource = codeGen.sources.get(CSS_TEXT_TYPE);
			if (cssTextSource) {
				cssText = /** @type {string} */ (cssTextSource.source());
			}
		}

		// An attribute value was entity-decoded before parsing, so re-escape
		// the processed CSS to keep the surrounding markup valid in any
		// quoting context, and drop the trailing newline the CSS generator
		// appends so the rewritten attribute stays on one line.
		if (dep.inAttribute) {
			cssText = cssText
				.replace(TRAILING_WHITESPACE_REGEXP, "")
				.replace(ATTR_ESCAPE_REGEXP, escapeAttrChar);
		}

		source.replace(dep.range[0], dep.range[1] - 1, cssText);
	}
};

makeSerializable(
	HtmlInlineStyleDependency,
	"webpack/lib/dependencies/HtmlInlineStyleDependency"
);

module.exports = HtmlInlineStyleDependency;
