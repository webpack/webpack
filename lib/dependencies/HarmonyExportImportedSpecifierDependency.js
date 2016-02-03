/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

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
	var active = HarmonyModulesHelpers.isActive(this.originModule, this);
	if(!this.importDependency.module || !used || !active) return null;
	return {
		module: this.importDependency.module,
		importedNames: this.id ? [this.id] : true,
		precedence: this.name ? 2 : 3
	};
};

HarmonyExportImportedSpecifierDependency.prototype.describeHarmonyExport = function() {
	return {
		exportedName: this.name,
		precedence: this.name ? 2 : 3
	};
};

HarmonyExportImportedSpecifierDependency.Template = function HarmonyExportImportedSpecifierDependencyTemplate() {};

HarmonyExportImportedSpecifierDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var name = dep.importedVar;
	var used = dep.originModule.isUsed(dep.name);
	var importedModule = dep.importDependency.module;
	var active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
	var content;
	var activeExports;
	if(!used) {
		content = "/* unused harmony reexport " + (dep.name || "namespace") + " */";
	} else if(!active) {
		content = "/* inactive harmony reexport " + (dep.name || "namespace") + " */";
	} else if(dep.name === "default" && !(importedModule && importedModule.meta && importedModule.meta.harmonyModule)) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(used) + ", {configurable: false, enumerable: true, get: function() { return " + name + "_default.a; }});";
	} else if(dep.name && dep.id) {
		var idUsed = importedModule && importedModule.isUsed(dep.id);
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(used) + ", {configurable: false, enumerable: true, get: function() { return " + (name + "[" + JSON.stringify(idUsed) + "]") + "; }});";
	} else if(dep.name) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(used) + ", {configurable: false, enumerable: true, get: function() { return " + name + "; }});";
	} else if(Array.isArray(dep.originModule.usedExports)) {
		activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule);
		var items = dep.originModule.usedExports.map(function(id) {
			if(id === "default") return;
			if(activeExports.indexOf(id) >= 0) return;
			var exportUsed = dep.originModule.isUsed(id);
			var idUsed = importedModule && importedModule.isUsed(id);
			return [exportUsed, idUsed];
		}).filter(Boolean);
		if(items.length > 1) {
			content = "/* harmony namespace reexport */ " + JSON.stringify(items) + ".forEach(function(i) { " +
				"Object.defineProperty(exports, i[0], {configurable: false, enumerable: true, get: function() { return " + (name + "[i[1]]") + "; }});" +
				"});";
		} else if(items.length === 1) {
			content = "/* harmony namespace reexport */ Object.defineProperty(exports, " + JSON.stringify(items[0][0]) + ", {configurable: false, enumerable: true, get: function() { return " + (name + "[" + JSON.stringify(items[0][1]) + "]") + "; }});";
		} else content = "/* unused harmony namespace reexport */";
	} else if(dep.originModule.usedExports) {
		activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule);
		content = "/* harmony namespace reexport */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") ";

		// Filter out exports which are defined by other exports
		// and filter out default export because it cannot be reexported with *
		if(activeExports.length > 0)
			content += "if(" + JSON.stringify(activeExports.concat("default")) + ".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
		else
			content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
		content += "(function(key) { Object.defineProperty(exports, key, {configurable: false, enumerable: true, get: function() { return " + name + "[key]; }}) }(__WEBPACK_IMPORT_KEY__));";
	}
	source.insert(dep.position, content);

};
