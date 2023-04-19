/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const mergeMaybeArrays = (a, b) => {
	const set = new Set();
	if (Array.isArray(a)) for (const item of a) set.add(item);
	else set.add(a);
	if (Array.isArray(b)) for (const item of b) set.add(item);
	else set.add(b);
	return Array.from(set);
};

const mergeRelatedInfo = (a, b) => {
	const result = { ...a, ...b };
	for (const key of Object.keys(a)) {
		if (key in b) {
			if (a[key] === b[key]) continue;
			result[key] = mergeMaybeArrays(a[key], b[key]);
		}
	}
	return result;
};

const mergeAssetInfo = (a, b) => {
	const result = { ...a, ...b };
	for (const key of Object.keys(a)) {
		if (key in b) {
			if (a[key] === b[key]) continue;
			switch (key) {
				case "fullhash":
				case "chunkhash":
				case "modulehash":
				case "contenthash":
					result[key] = mergeMaybeArrays(a[key], b[key]);
					break;
				case "immutable":
				case "development":
				case "hotModuleReplacement":
				case "javascriptModule":
					result[key] = a[key] || b[key];
					break;
				case "related":
					result[key] = mergeRelatedInfo(a[key], b[key]);
					break;
				default:
					throw new Error(`Can't handle conflicting asset info for ${key}`);
			}
		}
	}
	return result;
};

const getRawDataUrlModule = memoize(() => require("../asset/RawDataUrlModule"));

class CssUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range of the argument
	 * @param {"string" | "url"} urlType dependency type e.g. url() or string
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
	 * @param {string} context context directory
	 * @returns {Module} a module
	 */
	createIgnoredModule(context) {
		const RawDataUrlModule = getRawDataUrlModule();
		return new RawDataUrlModule("data:,", `ignored-asset`, `(ignored asset)`);
	}

	serialize(context) {
		const { write } = context;
		write(this.urlType);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.urlType = read();
		super.deserialize(context);
	}
}

const cssEscapeString = str => {
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
		return str.replace(/[\n\t ()'"\\]/g, m => `\\${m}`);
	} else if (countQuotation <= countApostrophe) {
		return `"${str.replace(/[\n"\\]/g, m => `\\${m}`)}"`;
	} else {
		return `'${str.replace(/[\n'\\]/g, m => `\\${m}`)}'`;
	}
};

CssUrlDependency.Template = class CssUrlDependencyTemplate extends (
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
		{ runtime, moduleGraph, chunkGraph, runtimeTemplate, codeGenerationResults }
	) {
		const dep = /** @type {CssUrlDependency} */ (dependency);
		const module = moduleGraph.getModule(dep);
		let publicPath = "";
		if (module && module.generator && module.generator.publicPath) {
			publicPath = module.generator.publicPath;
			if (typeof publicPath === "function") {
				let { path: filename, info: assetInfo } =
					runtimeTemplate.compilation.getAssetPathWithInfo(
						module._codeGeneratorData.get("filename"),
						{
							module,
							runtime,
							chunkGraph
						}
					);
				const { path, info } = runtimeTemplate.compilation.getAssetPathWithInfo(
					publicPath,
					{
						module,
						runtime,
						chunkGraph
					}
				);
				assetInfo = mergeAssetInfo(assetInfo, info);
				const assetPath = JSON.stringify(path + filename);
				publicPath = publicPath(assetPath, assetInfo);
			}
		}
		let newValue;

		switch (dep.urlType) {
			case "string":
				newValue = cssEscapeString(
					runtimeTemplate.assetUrl({
						publicPath,
						module,
						codeGenerationResults
					})
				);
				break;
			case "url":
				newValue = `url(${cssEscapeString(
					runtimeTemplate.assetUrl({
						publicPath,
						module,
						codeGenerationResults
					})
				)})`;
				break;
		}

		source.replace(dep.range[0], dep.range[1] - 1, newValue);
	}
};

makeSerializable(CssUrlDependency, "webpack/lib/dependencies/CssUrlDependency");

module.exports = CssUrlDependency;
