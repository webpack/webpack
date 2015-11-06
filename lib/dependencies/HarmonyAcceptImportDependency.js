/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HarmonyImportDependency = require("./HarmonyImportDependency");

function HarmonyAcceptImportDependency(request, importedVar, range) {
	HarmonyImportDependency.call(this, request, importedVar, range);
}
module.exports = HarmonyAcceptImportDependency;

HarmonyAcceptImportDependency.prototype = Object.create(HarmonyImportDependency.prototype);
HarmonyAcceptImportDependency.prototype.constructor = HarmonyAcceptImportDependency;
HarmonyAcceptImportDependency.prototype.type = "harmony accept";

HarmonyAcceptImportDependency.Template = function HarmonyAcceptImportDependencyTemplate() {};

HarmonyAcceptImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {};
