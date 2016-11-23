/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

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
};

HarmonyImportSpecifierDependency.prototype.getWarnings = function() {
	var importedModule = this.importDependency.module;
	if(importedModule && importedModule.meta && importedModule.meta.harmonyModule) {
		if(this.id && importedModule.isProvided(this.id) === false) {
			var err = new Error("export '" + this.id + "'" +
				(this.id !== this.name ? " (imported as '" + this.name + "')" : "") +
				" was not found in '" + this.importDependency.userRequest + "'");
			err.hideStack = true;
			return [
				err
			];
		}
	}
};

HarmonyImportSpecifierDependency.prototype.updateHash = function(hash) {
	NullDependency.prototype.updateHash.call(this, hash);
	var importedModule = this.importDependency.module;
	hash.update((importedModule && importedModule.id) + "");
	hash.update((importedModule && this.id) + "");
	hash.update((importedModule && this.importedVar) + "");
	hash.update((importedModule && this.id && importedModule.isUsed(this.id)) + "");
	hash.update((importedModule && (!importedModule.meta || importedModule.meta.harmonyModule)) + "");
	hash.update((importedModule && (importedModule.used + JSON.stringify(importedModule.usedExports))) + "");
};

HarmonyImportSpecifierDependency.Template = function HarmonyImportSpecifierDependencyTemplate() {};

HarmonyImportSpecifierDependency.Template.prototype.apply = function(dep, source) {
	var content;
	var importedModule = dep.importDependency.module;
	var defaultImport = dep.directImport && dep.id === "default" && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
	if(defaultImport) {
		content = dep.importedVar + "_default.a";
	} else if(dep.id) {
		var used = importedModule ? importedModule.isUsed(dep.id) : dep.id;
		content = dep.importedVar + "[" + JSON.stringify(used) + (dep.id !== used ? " /* " + dep.id + " */" : "") + "]";
	} else {
		content = dep.importedVar;
	}
	if(dep.call) {
		if(defaultImport) {
			content = dep.importedVar + "_default()";
		} else if(dep.id) {
			content = "__webpack_require__.i(" + content + ")";
		}
	}
	if(dep.shorthand) {
		content = dep.name + ": " + content;
	}
	source.replace(dep.range[0], dep.range[1] - 1, content);
};
