/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../InitFragment")} InitFragment */
/** @typedef {import("../util/createHash").Hash} Hash */
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
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, templateContext) {
		const dep = /** @type {HarmonyImportSideEffectDependency} */ (dependency);
		if (dep._module && dep._module.factoryMeta.sideEffectFree) {
			return null;
		} else {
			return super.getInitFragments(dep, templateContext);
		}
	}
};

module.exports = HarmonyImportSideEffectDependency;
