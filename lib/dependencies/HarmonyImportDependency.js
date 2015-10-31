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
HarmonyImportDependency.prototype.constructor = HarmonyImportDependency;
HarmonyImportDependency.prototype.type = "harmony import";

HarmonyImportDependency.prototype.getReference = function() {
	if(!this.module) return null;
	return {
		module: this.module,
		importedNames: false
	};
};

HarmonyImportDependency.Template = function HarmonyImportDependencyTemplate() {};

HarmonyImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	var content;
	if(!dep.module) {
		content = "throw new Error(" + JSON.stringify("Cannot find module \"" + dep.request + "\"") + ");\n";
	} else if(dep.importedVar) {
		content = "/* harmony import */ var " + dep.importedVar + " = __webpack_require__(" + comment + JSON.stringify(dep.module.id) + ");\n";
	} else {
		content = "";
	}
	source.replace(dep.range[0], dep.range[1] - 1, "");
	source.insert(0, content);
};
