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

class HtmlScriptSrcDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlScriptSrcDependency.
	 * @param {string} request request
	 * @param {Range} range range of the attribute value in the source
	 * @param {string} entryName name of the entry this script src is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 */
	constructor(request, range, entryName, category) {
		super(request);
		this.range = range;
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
	}

	get type() {
		return "html script src";
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
		this.entryName = read();
		this._category = read();
		super.deserialize(context);
	}
}

HtmlScriptSrcDependency.Template = class HtmlScriptSrcDependencyTemplate extends (
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
		const dep = /** @type {HtmlScriptSrcDependency} */ (dependency);
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

		source.replace(dep.range[0], dep.range[1] - 1, url);
	}
};

makeSerializable(
	HtmlScriptSrcDependency,
	"webpack/lib/dependencies/HtmlScriptSrcDependency"
);

module.exports = HtmlScriptSrcDependency;
