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

HarmonyImportSideEffectDependency.Template = HarmonyImportDependency.Template;

module.exports = HarmonyImportSideEffectDependency;
