/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function HarmonyImportDependency(request, importedVar, range) {
	ModuleDependency.call(this, request);
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

HarmonyImportDependency.prototype.updateHash = function updateHash(hash) {
	ModuleDependency.prototype.updateHash.call(this, hash);
	hash.update((this.module && (!this.module.meta || this.module.meta.harmonyModule)) + "");
};

HarmonyImportDependency.makeStatement = function(declare, dep, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	var declaration = declare ? "var " : "";
	var newline = declare ? "\n" : " ";
	var content;
	if(!dep.module) {
		content = "throw new Error(" + JSON.stringify("Cannot find module \"" + dep.request + "\"") + ");" + newline;
	} else if(dep.importedVar) {
		content = "/* harmony import */ " + declaration + dep.importedVar + " = __webpack_require__(" + comment + JSON.stringify(dep.module.id) + ");" + newline;
		if(!(dep.module.meta && dep.module.meta.harmonyModule)) {
			content += "/* harmony import */ " + declaration + dep.importedVar + "_default = __webpack_require__.n(" + dep.importedVar + ");" + newline;
		}
	} else {
		content = "";
	}
	return content;
};

HarmonyImportDependency.Template = function HarmonyImportDependencyTemplate() {};

HarmonyImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var content = HarmonyImportDependency.makeStatement(true, dep, outputOptions, requestShortener);
	source.replace(dep.range[0], dep.range[1] - 1, "");
	source.insert(-1, content);
};
