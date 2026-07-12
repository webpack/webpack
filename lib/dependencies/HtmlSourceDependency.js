/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

import { ASSET_URL_TYPE } from "../ModuleSourceTypeConstants.js";
import RawDataUrlModule from "../asset/RawDataUrlModule.js";
import makeSerializable from "../util/makeSerializable.js";
import memoize from "../util/memoize.js";
import ModuleDependency from "./ModuleDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults.js").default} CodeGenerationResults */
/** @typedef {import("../Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("../Module.js").BuildInfo} BuildInfo */
/** @typedef {import("../Module.js").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module.js").CodeGenerationResultData} CodeGenerationResultData */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */

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
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// Fold in the asset's hash so the HTML invalidates when the embedded URL changes.
		const { chunkGraph } = context;
		const module = chunkGraph.moduleGraph.getModule(this);
		if (!module) return;
		const { hash: buildHash } = /** @type {BuildInfo} */ (module.buildInfo);
		if (buildHash) hash.update(buildHash);
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
		if (!url || !url[ASSET_URL_TYPE]) return "data:,";
		return url[ASSET_URL_TYPE];
	}
};

makeSerializable(
	HtmlSourceDependency,
	"webpack/lib/dependencies/HtmlSourceDependency"
);

export default HtmlSourceDependency;

export { HtmlSourceDependency as "module.exports" };
