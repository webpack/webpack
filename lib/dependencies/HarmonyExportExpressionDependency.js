/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportExpressionDependency(originModule, range, rangeStatement) {
	NullDependency.call(this);
	this.originModule = originModule;
	this.range = range;
	this.rangeStatement = rangeStatement;
}
module.exports = HarmonyExportExpressionDependency;

HarmonyExportExpressionDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportExpressionDependency.prototype.constructor = HarmonyExportExpressionDependency;
HarmonyExportExpressionDependency.prototype.type = "harmony export expression";

HarmonyExportExpressionDependency.prototype.describeHarmonyExport = function() {
	return {
		exportedName: "default",
		precedence: 1
	};
};

HarmonyExportExpressionDependency.Template = function HarmonyExportDependencyTemplate() {};

HarmonyExportExpressionDependency.Template.prototype.apply = function(dep, source) {
	var used = dep.originModule.isUsed("default");
	var content;
	if(used)
		content = "/* harmony default export */ exports[" + JSON.stringify(used) + "] = ";
	else
		content = "/* unused harmony default export */ var _unused_webpack_default_export = ";
	if(dep.range) {
		source.replace(dep.rangeStatement[0], dep.range[0] - 1, content);
		source.replace(dep.range[1], dep.rangeStatement[1] - 1, ";");
	} else {
		source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
	}
};
