/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var HarmonyImportDependency = require("./HarmonyImportDependency");

function HarmonyAcceptDependency(range, dependencies, hasCallback) {
	NullDependency.call(this);
	this.range = range;
	this.dependencies = dependencies;
	this.hasCallback = hasCallback;
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
	if(dep.hasCallback) {
		source.insert(dep.range[0], "function(__WEBPACK_OUTDATED_DEPENDENCIES__) { " + content + "(");
		source.insert(dep.range[1], ")(__WEBPACK_OUTDATED_DEPENDENCIES__); }");
	} else {
		source.insert(dep.range[1] - 0.5, ", function() { " + content + "}");
	}
};
