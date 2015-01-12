/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function HarmonyExportSpecifierDependency(request, id, name, position) {
	NullDependency.call(this);
	this.Class = HarmonyExportSpecifierDependency;
	this.request = request;
	this.id = id;
	this.name = name;
	this.position = position;
}
module.exports = HarmonyExportSpecifierDependency;

HarmonyExportSpecifierDependency.prototype = Object.create(NullDependency.prototype);
HarmonyExportSpecifierDependency.prototype.type = "harmony export specifier";

HarmonyExportSpecifierDependency.Template = function HarmonyExportSpecifierDependencyTemplate() {};

HarmonyExportSpecifierDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var name = dep.request;
	if(dep.name) {
		var content = "/* harmony export */ Object.defineProperty(exports, " + JSON.stringify(dep.name) + ", {configurable: false, enumerable: true, get: function() { return " + (name ? name + "[" + JSON.stringify(dep.id) + "]" : dep.id) + "; }});"
	} else {
		var content = "/* harmony namespace export */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") (function(key) { Object.defineProperty(exports, key, {configurable: false, enumerable: true, get: function() { return " + name + "[key]; }}) }(__WEBPACK_IMPORT_KEY__));"
	}
	source.insert(dep.position, content);

};
