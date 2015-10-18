/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function RequireIncludeDependency(request, range) {
	ModuleDependency.call(this, request);
	this.range = range;
}
module.exports = RequireIncludeDependency;

RequireIncludeDependency.prototype = Object.create(ModuleDependency.prototype);
RequireIncludeDependency.prototype.constructor = RequireIncludeDependency;
RequireIncludeDependency.prototype.type = "require.include";

RequireIncludeDependency.Template = function RequireIncludeDependencyTemplate() {};

RequireIncludeDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo && dep.module)
		comment = "/*! require.include " + requestShortener.shorten(dep.request) + " */";
	source.replace(dep.range[0], dep.range[1] - 1,
		"undefined" + comment);
};
