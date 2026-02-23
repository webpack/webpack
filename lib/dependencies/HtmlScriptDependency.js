/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class HtmlScriptDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {Range} range range of the src attribute value
	 * @param {object} attributes script tag attributes
	 * @param {boolean=} attributes.async whether the script is async
	 * @param {boolean=} attributes.defer whether the script is deferred
	 * @param {string=} attributes.type the type attribute value
	 */
	constructor(request, range, attributes = {}) {
		super(request);
		this.range = range;
		this.scriptAttributes = attributes;
	}

	get type() {
		return "html script";
	}

	get category() {
		return "esm";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.scriptAttributes);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.scriptAttributes = read();
		super.deserialize(context);
	}
}

HtmlScriptDependency.Template = class HtmlScriptDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ moduleGraph, chunkGraph, runtimeTemplate, runtime }
	) {
		const dep = /** @type {HtmlScriptDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));
		if (!module) return;

		// Get the chunk(s) associated with this module
		const chunks = chunkGraph.getModuleChunksIterable(module);
		let filename;
		for (const chunk of chunks) {
			if (chunk.files.size > 0) {
				filename = [...chunk.files][0];
				break;
			}
		}
		if (filename) {
			source.replace(dep.range[0], dep.range[1] - 1, filename);
		}
	}
};

makeSerializable(
	HtmlScriptDependency,
	"webpack/lib/dependencies/HtmlScriptDependency"
);

module.exports = HtmlScriptDependency;
