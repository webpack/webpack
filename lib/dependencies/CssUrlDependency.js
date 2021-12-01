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

const getRawDataUrlModule = memoize(() => require("../asset/RawDataUrlModule"));

class CssUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range of the argument
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
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
}

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
		{ runtime, moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		const dep = /** @type {CssUrlDependency} */ (dependency);

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			runtimeTemplate.assetUrl({
				publicPath: "",
				runtime,
				module: moduleGraph.getModule(dep),
				codeGenerationResults
			})
		);
	}
};

makeSerializable(CssUrlDependency, "webpack/lib/dependencies/CssUrlDependency");

module.exports = CssUrlDependency;
