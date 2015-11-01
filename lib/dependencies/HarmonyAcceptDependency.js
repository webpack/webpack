/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var HarmonyImportDependency = require("./HarmonyImportDependency");

function HarmonyAcceptDependency(range, dependencies) {
	NullDependency.call(this);
	this.range = range;
	this.dependencies = dependencies;
}
module.exports = HarmonyAcceptDependency;

HarmonyAcceptDependency.prototype = Object.create(NullDependency.prototype);
HarmonyAcceptDependency.prototype.constructor = HarmonyAcceptDependency;
HarmonyAcceptDependency.prototype.type = "accepted harmony modules";

HarmonyAcceptDependency.Template = function HarmonyAcceptDependencyTemplate() {};

HarmonyAcceptDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var content = dep.dependencies.map(function(d) {
		return HarmonyImportDependency.makeStatement(false, d, outputOptions, requestShortener);
	}).join("");
	source.insert(dep.range[0], "function(callback) { " + content + " (");
	source.insert(dep.range[1], "()); }");
};
