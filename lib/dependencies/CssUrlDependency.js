/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
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
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<["string" | "url" | "src"]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<["string" | "url" | "src"]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../NormalModule.js").NormalModuleBuildInfo} NormalModuleBuildInfo */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class CssUrlDependency extends ModuleDependency {
	/**
	 * Creates an instance of CssUrlDependency.
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 * @param {"string" | "url" | "src"} urlType dependency type e.g. url() or string
	 */
	constructor(request, range, urlType) {
		super(request);
		this.range = range;
		this.urlType = urlType;
	}

	get type() {
		return "css url()";
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
		// The dependency template substitutes the referenced asset's hashed
		// filename into the rendered CSS at code-generation time. Folding the
		// asset module's content hash into the dependency hash ensures the
		// CSS module's hash invalidates — and the CSS chunk's contenthash
		// updates — whenever the referenced asset's content changes.
		const { chunkGraph } = context;
		const module = chunkGraph.moduleGraph.getModule(this);
		if (!module) return;
		const buildInfo = /** @type {NormalModuleBuildInfo | undefined} */ (
			module.buildInfo
		);
		if (buildInfo && buildInfo.hash) {
			hash.update(/** @type {string} */ (buildInfo.hash));
		}
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.urlType);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.urlType = context.read();
		super.deserialize(context.rest);
	}
}

// Hoisted out of `cssEscapeString` so the patterns + replacer aren't
// recompiled/reallocated per `url()` / `src()` reference at code-gen.
const CSS_ESCAPE_UNQUOTED_REGEXP = /[\n\t ()'"\\]/g;
const CSS_ESCAPE_DOUBLE_REGEXP = /[\n"\\]/g;
const CSS_ESCAPE_SINGLE_REGEXP = /[\n'\\]/g;
/**
 * @param {string} m matched character
 * @returns {string} the character backslash-escaped
 */
const cssEscapeReplacer = (m) => `\\${m}`;

/**
 * Returns string in quotes if needed.
 * @param {string} str string
 * @returns {string} string in quotes if needed
 */
const cssEscapeString = (str) => {
	let countWhiteOrBracket = 0;
	let countQuotation = 0;
	let countApostrophe = 0;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		switch (cc) {
			case 9: // tab
			case 10: // nl
			case 32: // space
			case 40: // (
			case 41: // )
				countWhiteOrBracket++;
				break;
			case 34:
				countQuotation++;
				break;
			case 39:
				countApostrophe++;
				break;
		}
	}
	if (countWhiteOrBracket < 2) {
		return str.replaceAll(CSS_ESCAPE_UNQUOTED_REGEXP, cssEscapeReplacer);
	} else if (countQuotation <= countApostrophe) {
		return `"${str.replaceAll(CSS_ESCAPE_DOUBLE_REGEXP, cssEscapeReplacer)}"`;
	}
	return `'${str.replaceAll(CSS_ESCAPE_SINGLE_REGEXP, cssEscapeReplacer)}'`;
};

CssUrlDependency.Template = class CssUrlDependencyTemplate extends (
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
		{ type, moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		if (type === "javascript") return;
		const dep = /** @type {CssUrlDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));

		/** @type {string | undefined} */
		let newValue;

		switch (dep.urlType) {
			case "string":
				newValue = cssEscapeString(
					this.assetUrl({
						module,
						codeGenerationResults
					})
				);
				break;
			case "url":
				newValue = `url(${cssEscapeString(
					this.assetUrl({
						module,
						codeGenerationResults
					})
				)})`;
				break;
			case "src":
				newValue = `src(${cssEscapeString(
					this.assetUrl({
						module,
						codeGenerationResults
					})
				)})`;
				break;
		}

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			/** @type {string} */ (newValue)
		);
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

makeSerializable(CssUrlDependency, "webpack/lib/dependencies/CssUrlDependency");

export default CssUrlDependency;

export { CssUrlDependency as "module.exports" };
