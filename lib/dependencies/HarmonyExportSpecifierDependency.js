/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportSpecifierDependency(originModule, id, name, position, immutable) {
	NullDependency.call(this);
	this.Class = HarmonyExportSpecifierDependency;
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

HarmonyExportSpecifierDependency.Template = function HarmonyExportSpecifierDependencyTemplate() {};

HarmonyExportSpecifierDependency.Template.prototype.apply = function(dep, source) {
	var used = dep.originModule.isUsed(dep.name);
	var content;
	if(!used) {
		content = "/* ununsed harmony export " + (dep.name || "namespace") + " */;";
	} else if(dep.immutable) {
		content = "/* harmony export */ exports[" + JSON.stringify(dep.name) + "] = " + dep.id + ";";
	} else {
		content = "/* harmony export */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + dep.id + "; }});";
	}
	source.insert(dep.position, content);

};
