/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleDependencyTemplateAsRequireId() {}
module.exports = ModuleDependencyTemplateAsRequireId;

ModuleDependencyTemplateAsRequireId.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	if(dep.module)
		var content = "(require(" + comment + dep.module.id + "))";
	else
		var content = "(function webpackMissingModule() { throw new Error(" + JSON.stringify("Cannot find module \"" + dep.request + "\"") + "); }())";
	source.replace(dep.range[0], dep.range[1]-1, content);
};

ModuleDependencyTemplateAsRequireId.prototype.applyAsTemplateArgument = function(name, dep, source, outputOptions, requestShortener) {
	source.replace(dep.range[0], dep.range[1]-1, "(require(" + name + "))");
};
