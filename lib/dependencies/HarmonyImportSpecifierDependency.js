/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyImportSpecifierDependency(importDependency, importedVar, id, name, range) {
	NullDependency.call(this);
	this.importDependency = importDependency;
	this.importedVar = importedVar;
	this.id = id;
	this.name = name;
	this.range = range;
}
module.exports = HarmonyImportSpecifierDependency;

HarmonyImportSpecifierDependency.prototype = Object.create(NullDependency.prototype);
HarmonyImportSpecifierDependency.prototype.constructor = HarmonyImportSpecifierDependency;
HarmonyImportSpecifierDependency.prototype.type = "harmony import specifier";

HarmonyImportSpecifierDependency.prototype.getReference = function() {
	if(!this.importDependency.module) return null;
	return {
		module: this.importDependency.module,
		importedNames: this.id ? [this.id] : true
	};
}

HarmonyImportSpecifierDependency.prototype.updateHash = function(hash) {
	NullDependency.prototype.updateHash.call(this, hash);
	var importedModule = this.importDependency.module;
	hash.update((importedModule && importedModule.id) + "");
	hash.update((importedModule && this.id) + "");
	hash.update((importedModule && this.importedVar) + "");
	hash.update((importedModule && this.id && importedModule.isUsed(this.id)) + "");
	hash.update((importedModule && importedModule.meta && importedModule.meta.harmonyModule) + "");
	hash.update((importedModule && (importedModule.used + JSON.stringify(importedModule.usedExports))) + "");
};

HarmonyImportSpecifierDependency.Template = function HarmonyImportSpecifierDependencyTemplate() {};

HarmonyImportSpecifierDependency.Template.prototype.apply = function(dep, source) {
	var content;
	var importedModule = dep.importDependency.module;
	if(dep.id === "default" && !(importedModule && importedModule.meta && importedModule.meta.harmonyModule)) {
		content = "/* harmony import */" + dep.importedVar + "_default.a";
	} else if(dep.id) {
		var used = importedModule ? importedModule.isUsed(dep.id) : dep.id;
		content = "/* harmony import */" + dep.importedVar + "[" + JSON.stringify(used) + "]";
	} else {
		content = "/* harmony namespace import */ " + dep.importedVar;
	}
	if(!dep.call) {
		source.replace(dep.range[0], dep.range[1] - 1, content);
	} else if(dep.callArgs.length > 0) {
		source.replace(dep.range[0], dep.callArgs[0].range[0] - 1, content + ".call(undefined, ");
	} else {
		source.replace(dep.call.range[0], dep.call.range[1] - 1, content + ".call()");
	}
};
