/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../InitFragment")} InitFragment */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/createHash").Hash} Hash */
/** @typedef {import("./DependencyReference")} DependencyReference */

class HarmonyImportSideEffectDependency extends HarmonyImportDependency {
	constructor(request, sourceOrder) {
		super(request, sourceOrder);
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		const module = moduleGraph.getModule(this);

		if (module && module.factoryMeta.sideEffectFree) {
			return null;
		}

		return super.getReference(moduleGraph);
	}

	get type() {
		return "harmony side effect evaluation";
	}
}

makeSerializable(
	HarmonyImportSideEffectDependency,
	"webpack/lib/dependencies/HarmonyImportSideEffectDependency"
);

HarmonyImportSideEffectDependency.Template = class HarmonyImportSideEffectDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyImportSideEffectDependency} */ (dependency);
		const { moduleGraph } = templateContext;
		const module = moduleGraph.getModule(dep);
		if (!module || !module.factoryMeta.sideEffectFree) {
			super.apply(dependency, source, templateContext);
		}
	}
};

module.exports = HarmonyImportSideEffectDependency;
