"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source) {
		const usedExports = dep.originModule.usedExports;
		if(usedExports && !Array.isArray(usedExports)) {
			const content = "Object.defineProperty(exports, \"__esModule\", { value: true });\n";
			source.insert(-1, content);
		}
	}
}
class HarmonyCompatiblilityDependency extends NullDependency {
	constructor(originModule) {
		super();
		this.originModule = originModule;
	}
}
HarmonyCompatiblilityDependency.Template = Template;
HarmonyCompatiblilityDependency.prototype.type = "harmony export header";
module.exports = HarmonyCompatiblilityDependency;
