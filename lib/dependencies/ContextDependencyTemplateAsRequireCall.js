/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ContextDependencyTemplateAsRequireCall() {}
module.exports = ContextDependencyTemplateAsRequireCall;

ContextDependencyTemplateAsRequireCall.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	if(dep.module) {
		if(dep.valueRange) {
			source.replace(dep.valueRange[1], dep.range[1]-1, ")");
			source.replace(dep.range[0], dep.valueRange[0]-1, "require(" + comment + dep.module.id + ")(" + (typeof dep.prepend == "string" ? JSON.stringify(dep.prepend) : "") + "");
		} else {
			source.replace(dep.range[0], dep.range[1]-1, "require(" + comment + dep.module.id + ")");
		}
	} else {
		var content = "(function webpackMissingModule() { throw new Error(" + JSON.stringify("Cannot find module \"" + dep.request + "\"") + "); }())";
		source.replace(dep.range[0], dep.range[1]-1, content);
	}
};
