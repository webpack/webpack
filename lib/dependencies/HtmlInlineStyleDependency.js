/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { CSS_TEXT_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * Represents an inline `<style>...</style>` block in an HTML module. The
 * tag's content is fed into webpack's CSS pipeline as a virtual CSS module
 * with `exportType: "text"` so `url()` and `\@import` references are
 * resolved relative to the HTML file. At render time the original content
 * range is replaced with the processed CSS text read from the CSS module's
 * code generation data.
 */
class HtmlInlineStyleDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlInlineStyleDependency.
	 * @param {string} request virtual request resolving to the inline CSS (data URI)
	 * @param {Range} range range of the inline CSS content (between `<style>` and `</style>`)
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "html inline style";
	}

	get category() {
		return "html-style";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
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

		source.replace(dep.range[0], dep.range[1] - 1, cssText);
	}
};

makeSerializable(
	HtmlInlineStyleDependency,
	"webpack/lib/dependencies/HtmlInlineStyleDependency"
);

module.exports = HtmlInlineStyleDependency;
