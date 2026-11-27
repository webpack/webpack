/*
	MIT License https://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const ModuleDependency = require("../core/ModuleDependency");

// only the template needs it, and that runs only for a real html module
const getHtmlGenerator = memoize(() => require("../../html/HtmlGenerator"));

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../../graph/Dependency.js" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate.js" */
/** @import { Range } from "../../javascript/JavascriptParser.js" */
/** @import { ObjectDeserializerContext as GenericObjectDeserializerContext, ObjectSerializerContext as GenericObjectSerializerContext } from "../../serialization/ObjectMiddleware.js" */
/** @typedef {GenericObjectDeserializerContext<[number, Range, string, string, Range | undefined, boolean, boolean, Range[] | undefined]>} ObjectDeserializerContext */
/** @typedef {GenericObjectSerializerContext<[number, Range, string, string, Range | undefined, boolean, boolean, Range[] | undefined]>} ObjectSerializerContext */

/**
 * Represents an inline `<script>...</script>` block in an HTML module. The
 * tag's body is bundled as its own entry chunk - the same pipeline that
 * processes `<script src>` - and the inline body is replaced with a
 * `src` attribute pointing at the emitted chunk URL. A tag sharing an
 * earlier tag's entry carries a `removeRange` and is dropped instead.
 */
class HtmlInlineScriptDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlInlineScriptDependency.
	 * @param {string} request virtual request resolving to the inline JS (data URI)
	 * @param {number} insertPos position right after `<script` where ` src="..."` is inserted
	 * @param {Range} contentRange range of the inline JS body (between `<script>` and `</script>`)
	 * @param {string} entryName name of the entry the inline JS is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 * @param {Range=} removeRange range of the whole element, when the tag is dropped
	 * @param {boolean=} forceInline `<!-- webpackInline: true -->` was set before this tag
	 * @param {boolean=} foreignContent the tag is in SVG or MathML, where its body is character data
	 * @param {Range[]=} textRanges the body's text runs, when the markup between them stays in the tag
	 */
	constructor(
		request,
		insertPos,
		contentRange,
		entryName,
		category,
		removeRange,
		forceInline,
		foreignContent,
		textRanges
	) {
		super(request);
		/** @type {number} */
		this.insertPos = insertPos;
		this.contentRange = contentRange;
		this.range = contentRange;
		/** @type {string} */
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
		/** @type {Range | undefined} */
		this.removeRange = removeRange;
		/** @type {boolean} */
		this.forceInline = forceInline === true;
		/** @type {boolean} */
		this.foreignContent = foreignContent === true;
		/** @type {Range[] | undefined} */
		this.textRanges = textRanges;
	}

	get type() {
		return "html inline script";
	}

	get category() {
		return this._category;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.insertPos)
			.write(this.contentRange)
			.write(this.entryName)
			.write(this._category)
			.write(this.removeRange)
			.write(this.forceInline)
			.write(this.foreignContent)
			.write(this.textRanges);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.insertPos = context.read();
		const c1 = context.rest;
		this.contentRange = c1.read();
		this.range = this.contentRange;
		const c2 = c1.rest;
		this.entryName = c2.read();
		const c3 = c2.rest;
		this._category = c3.read();
		const c4 = c3.rest;
		this.removeRange = c4.read();
		const c5 = c4.rest;
		this.forceInline = c5.read();
		const c6 = c5.rest;
		this.foreignContent = c6.read();
		const c7 = c6.rest;
		this.textRanges = c7.read();
		super.deserialize(c7.rest);
	}
}

HtmlInlineScriptDependency.Template = class HtmlInlineScriptDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { runtimeTemplate, chunkGraph, module } = templateContext;
		const dep = /** @type {HtmlInlineScriptDependency} */ (dependency);
		if (dep.removeRange) {
			source.replace(dep.removeRange[0], dep.removeRange[1] - 1, "");
			return;
		}
		const compilation = runtimeTemplate.compilation;
		const entrypoint = compilation.entrypoints.get(dep.entryName);

		/** @type {string} */
		let url = "data:,";

		if (entrypoint) {
			const chunk = entrypoint.getEntrypointChunk();
			// A sentinel only resolves in a page webpack emits; exported as a JS
			// string it would ride along unresolved.
			const isExtractedHtml = chunkGraph
				.getModuleSourceTypes(module)
				.has("html");
			// A foreign body is character data, where the code's `<` would open a tag.
			if (
				isExtractedHtml &&
				!dep.foreignContent &&
				getHtmlGenerator().canInlineChunk(compilation, chunk) &&
				(dep.forceInline ||
					getHtmlGenerator().isChunkInlined(
						compilation.outputOptions.html,
						chunk,
						"javascript"
					))
			) {
				// The tag stays as written and its body becomes the chunk's code, so
				// the run costs no request.
				source.replace(
					dep.contentRange[0],
					dep.contentRange[1] - 1,
					getHtmlGenerator().makeChunkInlineSentinel(chunk, "javascript")
				);
				return;
			}
			// Defer chunk-URL substitution to renderManifest - chunk hashes aren't ready yet.
			url = getHtmlGenerator().makeChunkUrlSentinel(chunk, "javascript");
		}

		// Insert ` src="..."` just after `<script` - `href` in SVG, which reads no
		// `src` - and clear the body so the unprocessed JS does not ride along.
		source.insert(
			dep.insertPos,
			` ${dep.foreignContent ? "href" : "src"}="${url}"`
		);
		// Markup kept in the body is left in place, so its own edits still apply.
		const textRanges = dep.textRanges || [dep.contentRange];
		for (const [start, end] of textRanges) {
			if (end > start) source.replace(start, end - 1, "");
		}
	}
};

makeSerializable(HtmlInlineScriptDependency, [
	"webpack/lib/dependencies/html/HtmlInlineScriptDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/HtmlInlineScriptDependency"
]);

module.exports = HtmlInlineScriptDependency;
