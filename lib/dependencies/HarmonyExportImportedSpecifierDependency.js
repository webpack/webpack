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
	var active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	var content;
	if(!used) {
		content = "/* unused harmony reexport " + (dep.name || "namespace") + " */";
	} else if(!active) {
		content = "/* inactive harmony reexport " + (dep.name || "namespace") + " */";
	} else if(dep.name === "default" && !(dep.importDependency.module.meta && dep.importDependency.module.meta.harmonyModule)) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + comment + name + "_default.a; }});";
	} else if(dep.name && dep.id) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + comment + (name + "[" + JSON.stringify(dep.id) + "]") + "; }});";
	} else if(dep.name) {
		content = "/* harmony reexport */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + comment + name + "; }});";
	} else {
		var activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule);
		content = "/* harmony namespace reexport */ for(var __WEBPACK_IMPORT_KEY__ in " + comment + name + ") ";

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
