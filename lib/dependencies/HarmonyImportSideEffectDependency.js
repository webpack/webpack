/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");

class HarmonyImportSideEffectDependency extends HarmonyImportDependency {
	constructor(request, originModule, sourceOrder, parserScope) {
		super(request, originModule, sourceOrder, parserScope);
	}

	getReference() {
		if (this.module && this.module.factoryMeta.sideEffectFree) return null;

		return super.getReference();
	}

	get type() {
		return "harmony side effect evaluation";
	}
}

HarmonyImportSideEffectDependency.Template = class HarmonyImportSideEffectDependencyTemplate extends HarmonyImportDependency.Template {
	getHarmonyInitOrder(dep) {
		if (dep.module && dep.module.factoryMeta.sideEffectFree) return NaN;
		return super.getHarmonyInitOrder(dep);
	}
};

module.exports = HarmonyImportSideEffectDependency;
