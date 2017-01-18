/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

class HarmonyCompatiblilityDependency extends NullDependency {
	constructor(originModule) {
		super();
		this.originModule = originModule;
	}

	get type() {
		return "harmony export header";
	}
}

HarmonyCompatiblilityDependency.Template = class HarmonyExportDependencyTemplate {
	apply(dep, source) {
		const usedExports = dep.originModule.usedExports;
		if(usedExports && !Array.isArray(usedExports)) {
			const exportName = dep.originModule.exportsArgument || "exports";
			const content = `Object.defineProperty(${exportName}, \"__esModule\", { value: true });\n`;
			source.insert(-1, content);
		}
	}
};

module.exports = HarmonyCompatiblilityDependency;
