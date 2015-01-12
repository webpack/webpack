/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function HarmonyImportDependency(request, importedVar, range) {
	ModuleDependency.call(this, request);
	this.Class = HarmonyImportDependency;
	this.range = range;
	this.importedVar = importedVar;
}
module.exports = HarmonyImportDependency;

HarmonyImportDependency.prototype = Object.create(ModuleDependency.prototype);
HarmonyImportDependency.prototype.type = "harmony import";

HarmonyImportDependency.Template = function HarmonyImportDependencyTemplate() {};

HarmonyImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	if(!dep.module) {
		var content = "!(function webpackMissingModule() { throw new Error(" + JSON.stringify("Cannot find module \"" + dep.request + "\"") + "); }())";
	} else if(dep.importedVar) {
		var content = "/* harmony import */ var " + dep.importedVar + " = __webpack_require__(" + comment + dep.module.id + ");";
	} else {
		var content = "";
	}
	source.replace(dep.range[0], dep.range[1]-1, content);
};
