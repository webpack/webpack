/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/Hash")} Hash */

class URLDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "new URL()";
	}

	get category() {
		return "url";
	}
}

URLDependency.Template = class URLDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate
		} = templateContext;
		const dep = /** @type {URLDependency} */ (dependency);

		runtimeRequirements.add(RuntimeGlobals.baseURI);
		runtimeRequirements.add(RuntimeGlobals.require);

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			`/* asset import */ ${runtimeTemplate.moduleRaw({
				chunkGraph,
				module: moduleGraph.getModule(dep),
				request: dep.request,
				runtimeRequirements,
				weak: false
			})}, ${RuntimeGlobals.baseURI}`
		);
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
