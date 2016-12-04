/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyCompatiblilityDependency(originModule) {
	NullDependency.call(this);
	this.originModule = originModule;
}
module.exports = HarmonyCompatiblilityDependency;

HarmonyCompatiblilityDependency.prototype = Object.create(NullDependency.prototype);
HarmonyCompatiblilityDependency.prototype.constructor = HarmonyCompatiblilityDependency;
HarmonyCompatiblilityDependency.prototype.type = "harmony export header";

HarmonyCompatiblilityDependency.Template = function HarmonyExportDependencyTemplate() {};

HarmonyCompatiblilityDependency.Template.prototype.apply = function(dep, source) {
	var usedExports = dep.originModule.usedExports;
	if(usedExports && !Array.isArray(usedExports)) {
		var content = "Object.defineProperty(exports, \"__esModule\", { value: true });\n";
		source.insert(-1, content);
	}
};
