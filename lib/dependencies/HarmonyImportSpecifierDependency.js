/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyImportSpecifierDependency(importedVar, id, name, range) {
	NullDependency.call(this);
	this.Class = HarmonyImportSpecifierDependency;
	this.importedVar = importedVar;
	this.id = id;
	this.name = name;
	this.range = range;
}
module.exports = HarmonyImportSpecifierDependency;

HarmonyImportSpecifierDependency.prototype = Object.create(NullDependency.prototype);
HarmonyImportSpecifierDependency.prototype.type = "harmony import specifier";

HarmonyImportSpecifierDependency.Template = function HarmonyImportSpecifierDependencyTemplate() {};

HarmonyImportSpecifierDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	if(dep.id) {
		var content = "/* harmony import */ " + dep.importedVar + "[" + JSON.stringify(dep.id) + "]";
	} else {
		var content = "/* harmony namespace import */ " + dep.importedVar;
	}
	source.replace(dep.range[0], dep.range[1]-1, content);
};
