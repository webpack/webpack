/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssUrlDependency = require("./CssUrlDependency");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/**
 * Represents an inline `<script>...</script>` block in an HTML module. The
 * tag's body is bundled as its own entry chunk — the same pipeline that
 * processes `<script src>` — and the inline body is replaced with a
 * `src` attribute pointing at the emitted chunk URL.
 */
class HtmlInlineScriptDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlInlineScriptDependency.
	 * @param {string} request virtual request resolving to the inline JS (data URI)
	 * @param {number} insertPos position right after `<script` where ` src="…"` is inserted
	 * @param {Range} contentRange range of the inline JS body (between `<script>` and `</script>`)
	 * @param {string} entryName name of the entry the inline JS is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 */
	constructor(request, insertPos, contentRange, entryName, category) {
		super(request);
		this.insertPos = insertPos;
		this.contentRange = contentRange;
		this.range = contentRange;
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
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
		const { write } = context;
		write(this.insertPos);
		write(this.contentRange);
		write(this.entryName);
		write(this._category);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.insertPos = read();
		this.contentRange = read();
		this.range = this.contentRange;
		this.entryName = read();
		this._category = read();
		super.deserialize(context);
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
		const compilation = runtimeTemplate.compilation;
		const entrypoint = /** @type {Entrypoint | undefined} */ (
			compilation.entrypoints.get(dep.entryName)
		);

		/** @type {string} */
		let url = "data:,";

		if (entrypoint) {
			const chunk = /** @type {Chunk} */ (entrypoint.getEntrypointChunk());
			const outputOptions = runtimeTemplate.outputOptions;
			const filenameTemplate =
				chunk.filenameTemplate ||
				(chunk.canBeInitial()
					? outputOptions.filename
					: outputOptions.chunkFilename);

			const filename = compilation.getPath(filenameTemplate, {
				chunk,
				contentHashType: "javascript"
			});

			url = `${CssUrlDependency.PUBLIC_PATH_AUTO}${filename}`;
		}

		// Insert ` src="…"` right after `<script` so the inline body is
		// served from the emitted chunk instead. The browser ignores the
		// remaining inline body once `src` is present, but we still clear
		// it below so the unprocessed JS doesn't ride along.
		source.insert(dep.insertPos, ` src="${url}"`);
		source.replace(dep.contentRange[0], dep.contentRange[1] - 1, "");
	}
};

makeSerializable(
	HtmlInlineScriptDependency,
	"webpack/lib/dependencies/HtmlInlineScriptDependency"
);

module.exports = HtmlInlineScriptDependency;
