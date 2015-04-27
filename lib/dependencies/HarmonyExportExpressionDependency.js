/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportExpressionDependency(name, range, rangeStatement) {
	NullDependency.call(this);
	this.Class = HarmonyExportExpressionDependency;
	this.name = name;
	this.range = range;
	this.rangeStatement = rangeStatement;
}
module.exports = HarmonyExportExpressionDependency;

HarmonyExportExpressionDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportExpressionDependency.prototype.type = "harmony export expression";

HarmonyExportExpressionDependency.Template = function HarmonyExportDependencyTemplate() {};

HarmonyExportExpressionDependency.Template.prototype.apply = function(dep, source) {
	var content;
	if(dep.name) {
		content = "exports[" + JSON.stringify(dep.name) + "] = ";
	} else {
		content = "/* harmony export declaration */";
	}
	source.replace(dep.rangeStatement[0], dep.range ? dep.range[0] - 1 : dep.rangeStatement[1] - 1, content);
};
