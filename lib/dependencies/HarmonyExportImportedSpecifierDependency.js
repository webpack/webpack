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
	if(!this.originModule.usedExports) return null;
	var m = this.importDependency.module;
	if(!this.name) {
		// export *
		if(Array.isArray(this.originModule.usedExports)) {
			// reexport * with known used exports
			var activeExports = HarmonyModulesHelpers.getActiveExports(this.originModule);
			return {
				module: m,
				importedNames: this.originModule.usedExports.filter(function(id) {
					return activeExports.indexOf(id) < 0;
				})
			}
		} else {
			return {
				module: m,
				importedNames: true
			}
		}
	} else {
		if(Array.isArray(this.originModule.usedExports) && this.originModule.usedExports.indexOf(this.name) < 0) return null;
		if(this.id) {
			// export { name as name }
			return {
				module: m,
				importedNames: [this.id]
			};
		} else {
			// export { * as name }
			return {
				module: m,
				importedNames: true
			};
		}
	}
};

HarmonyExportImportedSpecifierDependency.prototype.describeHarmonyExport = function() {
	return {
		exportedName: this.name,
		precedence: this.name ? 2 : 3
	};
};

HarmonyExportImportedSpecifierDependency.prototype.updateHash = function(hash) {
	NullDependency.prototype.updateHash.call(this, hash);
	var importedModule = this.importDependency.module;
	hash.update((importedModule && (importedModule.used + JSON.stringify(importedModule.usedExports))) + "");
};

HarmonyExportImportedSpecifierDependency.Template = function HarmonyExportImportedSpecifierDependencyTemplate() {};

HarmonyExportImportedSpecifierDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var name = dep.importedVar;
	var used = dep.originModule.isUsed(dep.name);
	var importedModule = dep.importDependency.module;
	var active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
	var content;
	var activeExports;

	function getReexportStatement(key, valueKey) {
		return(importIsHarmony || !valueKey ? "" : "if(__webpack_require__.o(" + name + ", " + valueKey + ")) ") +
			"__webpack_require__.d(exports, " + key + ", " +
			"function() { return " + name + (valueKey === null ? "_default.a" : valueKey && "[" + valueKey + "]") + "; });"
	}
	if(!used) { // we want to rexport something, but the export isn't used
		content = "/* unused harmony reexport " + dep.name + " */\n";
	} else if(!active) { // we want to reexport something but another exports overrides this one
		content = "/* inactive harmony reexport " + (dep.name || "namespace") + " */\n";
	} else if(dep.name && dep.id === "default" && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule))) { // we want to reexport the default export from a non-hamory module
		content = "/* harmony reexport */ " + getReexportStatement(JSON.stringify(used), null) + "\n";
	} else if(dep.name && dep.id) { // we want to reexport a key as new key
		var idUsed = importedModule && importedModule.isUsed(dep.id);
		content = "/* harmony reexport */ " + getReexportStatement(JSON.stringify(used), JSON.stringify(idUsed)) + "\n";
	} else if(dep.name) { // we want to reexport the module object as named export
		content = "/* harmony reexport */ " + getReexportStatement(JSON.stringify(used), "") + "\n";
	} else if(Array.isArray(dep.originModule.usedExports)) { // we know which exports are used
		activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule);
		var importIsHarmony = importedModule && (!importedModule.meta || importedModule.meta.harmonyModule);
		var importActiveExports = importedModule && HarmonyModulesHelpers.getActiveExports(importedModule);
		var items = dep.originModule.usedExports.map(function(id) {
			if(id === "default") return;
			if(activeExports.indexOf(id) >= 0) return;
			if(importIsHarmony && !HarmonyModulesHelpers.isExportedByHarmony(importedModule, id)) return;
			var exportUsed = dep.originModule.isUsed(id);
			var idUsed = importedModule && importedModule.isUsed(id);
			return [exportUsed, idUsed];
		}).filter(Boolean);
		if(items.length > 0) {
			content = "/* harmony namespace reexport */ " + items.map(function(item) {
				return getReexportStatement(JSON.stringify(item[0]), JSON.stringify(item[1]));
			}).join(" ") + "\n";
		} else content = "/* unused harmony namespace reexport */\n";
	} else if(dep.originModule.usedExports) { // not sure which exports are used
		activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule);
		content = "/* harmony namespace reexport */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") ";

		// Filter out exports which are defined by other exports
		// and filter out default export because it cannot be reexported with *
		if(activeExports.length > 0)
			content += "if(" + JSON.stringify(activeExports.concat("default")) + ".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
		else
			content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
		content += "(function(key) { __webpack_require__.d(exports, key, function() { return " + name + "[key]; }) }(__WEBPACK_IMPORT_KEY__));\n";
	} else {
		content = "/* unused harmony reexport namespace */\n";
	}
	source.insert(dep.position, content);
};
