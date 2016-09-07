/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

function HarmonyExportSpecifierDependency(originModule, id, name, position, immutable) {
	NullDependency.call(this);
	this.originModule = originModule;
	this.id = id;
	this.name = name;
	this.position = position;
	this.immutable = immutable;
}
module.exports = HarmonyExportSpecifierDependency;

HarmonyExportSpecifierDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportSpecifierDependency.prototype.constructor = HarmonyExportSpecifierDependency;
HarmonyExportSpecifierDependency.prototype.type = "harmony export specifier";

HarmonyExportSpecifierDependency.prototype.getExports = function() {
	return {
		exports: [this.name]
	}
};

HarmonyExportSpecifierDependency.prototype.describeHarmonyExport = function() {
	return {
		exportedName: this.name,
		precedence: 1
	};
};

HarmonyExportSpecifierDependency.Template = function HarmonyExportSpecifierDependencyTemplate() {};

HarmonyExportSpecifierDependency.Template.prototype.apply = function(dep, source) {
	var used = dep.originModule.isUsed(dep.name);
	var active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
	var content;
	if(!used) {
		content = "/* unused harmony export " + (dep.name || "namespace") + " */\n";
	} else if(!active) {
		content = "/* inactive harmony export " + (dep.name || "namespace") + " */\n";
	} else if(dep.immutable) {
		content = "/* harmony export (immutable) */ exports[" + JSON.stringify(used) + "] = " + dep.id + ";\n";
	} else {
		content = "/* harmony export (binding) */ __webpack_require__.d(exports, " + JSON.stringify(used) + ", function() { return " + dep.id + "; });\n";
	}
	if(dep.position > 0)
		content = "\n" + content;
	source.insert(dep.position, content);

};
