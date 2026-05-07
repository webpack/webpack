/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RawDataUrlModule = require("../asset/RawDataUrlModule");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").CodeGenerationResultData} CodeGenerationResultData */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class HtmlSourceDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlSourceDependency.
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "html source()";
	}

	get category() {
		return "url";
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
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

HtmlSourceDependency.Template = class HtmlSourceDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		const dep = /** @type {HtmlSourceDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));

		/** @type {string | undefined} */
		const newValue = this.assetUrl({
			module,
			codeGenerationResults
		});

		source.replace(dep.range[0], dep.range[1] - 1, newValue);
	}

	/**
	 * Returns the url of the asset.
	 * @param {object} options options object
	 * @param {Module} options.module the module
	 * @param {RuntimeSpec=} options.runtime runtime
	 * @param {CodeGenerationResults} options.codeGenerationResults the code generation results
	 * @returns {string} the url of the asset
	 */
	assetUrl({ runtime, module, codeGenerationResults }) {
		if (!module) {
			return "data:,";
		}
		const codeGen = codeGenerationResults.get(module, runtime);
		const data = codeGen.data;
		if (!data) return "data:,";
		const url = data.get("url");
		if (!url || !url["css-url"]) return "data:,";
		return url["css-url"];
	}
};

makeSerializable(
	HtmlSourceDependency,
	"webpack/lib/dependencies/HtmlSourceDependency"
);

module.exports = HtmlSourceDependency;
