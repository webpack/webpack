/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("./DependencyReference")} DependencyReference */

class HarmonyImportSideEffectDependency extends HarmonyImportDependency {
	constructor(request, originModule, sourceOrder, parserScope) {
		super(request, originModule, sourceOrder, parserScope);
	}

	/**
	 * Returns the referenced module and export
	 * @returns {DependencyReference} reference
	 */
	getReference() {
		if (this._module && this._module.factoryMeta.sideEffectFree) {
			return null;
		}
		return super.getReference();
	}

	get type() {
		return "harmony side effect evaluation";
	}
}

HarmonyImportSideEffectDependency.Template = class HarmonyImportSideEffectDependencyTemplate extends HarmonyImportDependency.Template {
	getInitFragments(dependency, source, runtimeTemplate, dependencyTemplates) {
		if (dependency._module && dependency._module.factoryMeta.sideEffectFree) {
			return null;
		} else {
			return super.getInitFragments(
				dependency,
				source,
				runtimeTemplate,
				dependencyTemplates
			);
		}
	}
};

module.exports = HarmonyImportSideEffectDependency;
