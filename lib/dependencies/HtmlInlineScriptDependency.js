/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

// only the template needs it, and that runs only for a real html module
const getHtmlGenerator = memoize(() => require("../html/HtmlGenerator"));

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Chunk from "../Chunk" */
/** @import Dependency from "../Dependency" */
/** @import { DependencyTemplateContext } from "../template/DependencyTemplate" */
/** @import Entrypoint from "../Entrypoint" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[number, Range, string, string, Range | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[number, Range, string, string, Range | undefined]>} ObjectSerializerContext */

/**
 * Represents an inline `<script>...</script>` block in an HTML module. The
 * tag's body is bundled as its own entry chunk — the same pipeline that
 * processes `<script src>` — and the inline body is replaced with a
 * `src` attribute pointing at the emitted chunk URL. A tag sharing an
 * earlier tag's entry carries a `removeRange` and is dropped instead.
 */
class HtmlInlineScriptDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlInlineScriptDependency.
	 * @param {string} request virtual request resolving to the inline JS (data URI)
	 * @param {number} insertPos position right after `<script` where ` src="…"` is inserted
	 * @param {Range} contentRange range of the inline JS body (between `<script>` and `</script>`)
	 * @param {string} entryName name of the entry the inline JS is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 * @param {Range=} removeRange range of the whole element, when the tag is dropped
	 */
	constructor(
		request,
		insertPos,
		contentRange,
		entryName,
		category,
		removeRange
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
			.write(this.removeRange);
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
		super.deserialize(c4.rest);
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
		const { runtimeTemplate } = templateContext;
		const dep = /** @type {HtmlInlineScriptDependency} */ (dependency);
		if (dep.removeRange) {
			source.replace(dep.removeRange[0], dep.removeRange[1] - 1, "");
			return;
		}
		const compilation = runtimeTemplate.compilation;
		const entrypoint = /** @type {Entrypoint | undefined} */ (
			compilation.entrypoints.get(dep.entryName)
		);

		/** @type {string} */
		let url = "data:,";

		if (entrypoint) {
			const chunk = /** @type {Chunk} */ (entrypoint.getEntrypointChunk());
			// Defer chunk-URL substitution to renderManifest — chunk hashes aren't ready yet.
			url = getHtmlGenerator().makeChunkUrlSentinel(chunk, "javascript");
		}

		// Insert ` src="…"` just after `<script`, serving the body from the emitted
		// chunk. The browser ignores an inline body beside `src`, but it is cleared
		// below so the unprocessed JS does not ride along.
		source.insert(dep.insertPos, ` src="${url}"`);
		source.replace(dep.contentRange[0], dep.contentRange[1] - 1, "");
	}
};

makeSerializable(
	HtmlInlineScriptDependency,
	"webpack/lib/dependencies/HtmlInlineScriptDependency"
);

module.exports = HtmlInlineScriptDependency;
