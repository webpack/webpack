/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportHeaderDependency(range, rangeStatement) {
	NullDependency.call(this);
	this.range = range;
	this.rangeStatement = rangeStatement;
}
module.exports = HarmonyExportHeaderDependency;

HarmonyExportHeaderDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportHeaderDependency.prototype.constructor = HarmonyExportHeaderDependency;
HarmonyExportHeaderDependency.prototype.type = "harmony export header";

HarmonyExportHeaderDependency.Template = function HarmonyExportDependencyTemplate() {};

HarmonyExportHeaderDependency.Template.prototype.apply = function(dep, source) {
	var content;
	content = "";
	source.replace(dep.rangeStatement[0], dep.range ? dep.range[0] - 1 : dep.rangeStatement[1] - 1, content);
};
