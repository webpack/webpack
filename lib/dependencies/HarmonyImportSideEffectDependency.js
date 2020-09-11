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
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class HarmonyImportSideEffectDependency extends HarmonyImportDependency {
	constructor(request, sourceOrder) {
		super(request, sourceOrder);
	}

	get type() {
		return "harmony side effect evaluation";
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {function(ModuleGraphConnection, RuntimeSpec): boolean} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return connection => {
			const refModule = connection.resolvedModule;
			return (
				!refModule ||
				refModule.factoryMeta === undefined ||
				!refModule.factoryMeta.sideEffectFree
			);
		};
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
		const { moduleGraph, concatenationScope } = templateContext;
		if (concatenationScope) {
			const module = moduleGraph.getModule(dependency);
			if (concatenationScope.isModuleInScope(module)) {
				return;
			}
		}
		super.apply(dependency, source, templateContext);
	}
};

module.exports = HarmonyImportSideEffectDependency;
