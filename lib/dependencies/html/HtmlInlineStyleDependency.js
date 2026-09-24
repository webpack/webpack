/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { CSS_TEXT_TYPE } = require("../../module/ModuleSourceTypeConstants");
const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependency = require("../ModuleDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import CodeGenerationResults from "../../module/CodeGenerationResults" */
/** @import Dependency, { UpdateHashContext } from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Module from "../../module/Module" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<boolean[]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<boolean[]>} ObjectSerializerContext */
/** @import Hash from "../../util/Hash" */

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

// Character data needs only the two that open markup: `&` starts a character
// reference and `<` a tag. A CR is written as a reference because §13.2.3.5
// rewrites a literal one to LF before the tokenizer reads it.
const TEXT_ESCAPE_REGEXP = /[&<\r]/g;
/** @type {Record<string, string>} */
const TEXT_ESCAPES = { "&": "&amp;", "<": "&lt;", "\r": "&#13;" };
/**
 * @param {string} c matched character
 * @returns {string} the HTML-text-escaped entity
 */
const escapeTextChar = (c) => TEXT_ESCAPES[c];

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
	 * @param {boolean=} characterData true when the range is a `<style>` body in a foreign (SVG/MathML) subtree, where the content model is character data rather than raw text, so the processed CSS is escaped as text on write-back
	 */
	constructor(
		request,
		range,
		attribute = false,
		inAttribute = attribute,
		characterData = false
	) {
		super(request);
		this.range = range;
		/** @type {boolean} */
		this.attribute = attribute;
		/** @type {boolean} */
		this.inAttribute = inAttribute;
		/** @type {boolean} */
		this.characterData = characterData;
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
		context.write(this.characterData);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
		this.attribute = context.read();
		this.inAttribute = context.read();
		this.characterData = context.read();
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

		// An attribute value was entity-decoded before parsing, so the processed CSS
		// is re-escaped to keep the markup valid in any quoting context, and the
		// generator's trailing newline dropped to keep it on one line.
		if (dep.inAttribute) {
			cssText = cssText
				.replace(TRAILING_WHITESPACE_REGEXP, "")
				.replace(ATTR_ESCAPE_REGEXP, escapeAttrChar);
		} else {
			// A `<style>` body keeps the whitespace its source ends with: the newline
			// the generator appends to hold a stylesheet's modules apart is no fixed
			// point here, and a page built from an emitted one would gain one a pass.
			if (cssText.endsWith("\n")) cssText = cssText.slice(0, -1);
			if (dep.characterData) {
				// A foreign `<style>` body was entity-decoded before parsing, so the
				// processed CSS is escaped back as text — its newlines stay literal,
				// which an attribute value could not afford.
				cssText = cssText.replace(TEXT_ESCAPE_REGEXP, escapeTextChar);
			}
		}

		source.replace(dep.range[0], dep.range[1] - 1, cssText);
	}
};

makeSerializable(
	HtmlInlineStyleDependency,
	"webpack/lib/dependencies/html/HtmlInlineStyleDependency"
);
registerLegacyRequest(
	HtmlInlineStyleDependency,
	"webpack/lib/dependencies/HtmlInlineStyleDependency"
);

module.exports = HtmlInlineStyleDependency;
