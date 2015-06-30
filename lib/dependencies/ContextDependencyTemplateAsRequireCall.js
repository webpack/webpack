/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ContextDependencyTemplateAsRequireCall() {}
module.exports = ContextDependencyTemplateAsRequireCall;

ContextDependencyTemplateAsRequireCall.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	var containsDeps = dep.module && (dep.module.dependencies && dep.module.dependencies.length > 0);
	var isAsync = dep.module && dep.module.async;
	if(dep.module && (isAsync || containsDeps)) {
		if(dep.valueRange) {
			source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
			source.replace(dep.range[0], dep.valueRange[0] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")(" + (typeof dep.prepend === "string" ? JSON.stringify(dep.prepend) : "") + "");
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")");
		}
	} else {
		var content = require("./WebpackMissingModule").module(dep.request);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};

ContextDependencyTemplateAsRequireCall.prototype.applyAsTemplateArgument = function(name, dep, source) {
	if(dep.valueRange) {
		source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
		source.replace(dep.range[0], dep.valueRange[0] - 1, "__webpack_require__(" + name + ")(" + (typeof dep.prepend === "string" ? JSON.stringify(dep.prepend) : "") + "");
	} else {
		source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__(" + name + ")");
	}
};
