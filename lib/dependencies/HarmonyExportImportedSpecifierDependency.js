/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportImportedSpecifierDependency(originModule, importDependency, importedVar, id, name, position) {
	NullDependency.call(this);
	this.originModule = originModule;
	this.importDependency = importDependency;
	this.importedVar = importedVar;
	this.id = id;
	this.name = name;
	this.position = position;
}
module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportImportedSpecifierDependency.prototype.constructor = HarmonyExportImportedSpecifierDependency;
HarmonyExportImportedSpecifierDependency.prototype.type = "harmony export imported specifier";

HarmonyExportImportedSpecifierDependency.prototype.getReference = function() {
	var used = this.originModule.isUsed(this.name);
	if(!this.importDependency.module || !used) return null;
	return {
		module: this.importDependency.module,
		importedNames: this.id ? [this.id] : true
	};
};

HarmonyExportImportedSpecifierDependency.Template = function HarmonyExportImportedSpecifierDependencyTemplate() {};

HarmonyExportImportedSpecifierDependency.Template.prototype.apply = function(dep, source) {
	var name = dep.importedVar;
	var used = dep.originModule.isUsed(dep.name);
	var content;
	if(!used) {
		content = "/* ununsed harmony reexport " + (dep.name || "namespace") + " */;";
	} else if(dep.name === "default" && !dep.importDependency.module.meta.harmonyModule) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + name + "_default.a; }});";
	} else if(dep.name) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + (name + "[" + JSON.stringify(dep.id) + "]") + "; }});";
	} else {
		content = "/* harmony namespace reexport */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") (function(key) { Object.defineProperty(exports, key, {configurable: false, enumerable: true, get: function() { return " + name + "[key]; }}) }(__WEBPACK_IMPORT_KEY__));";
	}
	source.insert(dep.position, content);

};
