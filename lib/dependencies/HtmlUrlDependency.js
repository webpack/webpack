/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class HtmlUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 * @param {"src" | "href" | "srcset"} urlType type of HTML URL attribute
	 */
	constructor(request, range, urlType) {
		super(request);
		this.range = range;
		this.urlType = urlType;
	}

	get type() {
		return "html url";
	}

	get category() {
		return "url";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.urlType);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.urlType = read();
		super.deserialize(context);
	}
}

HtmlUrlDependency.Template = class HtmlUrlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { moduleGraph, runtime, codeGenerationResults }) {
		const dep = /** @type {HtmlUrlDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));
		if (!module) return;

		const codeGen = codeGenerationResults.get(module, runtime);
		const data = codeGen.data;
		if (!data) return;

		const url = data.get("url");
		const newValue = url
			? url["css-url"] || url.toString()
			: data.get("filename") || "";

		if (newValue) {
			source.replace(dep.range[0], dep.range[1] - 1, newValue);
		}
	}
};

makeSerializable(
	HtmlUrlDependency,
	"webpack/lib/dependencies/HtmlUrlDependency"
);

module.exports = HtmlUrlDependency;
