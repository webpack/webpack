/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ContextDependencyTemplateAsId() {}
module.exports = ContextDependencyTemplateAsId;

ContextDependencyTemplateAsId.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	if(dep.module && dep.module.dependencies && dep.module.dependencies.length > 0) {
		if(dep.valueRange) {
			if(Array.isArray(dep.replaces)) {
				for(var i = 0; i < dep.replaces.length; i++) {
					var rep = dep.replaces[i];
					source.replace(rep.range[0], rep.range[1] - 1, rep.value);
				}
			}
			source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
			source.replace(dep.range[0], dep.valueRange[0] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ").resolve(" + (typeof dep.prepend === "string" ? JSON.stringify(dep.prepend) : "") + "");
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ").resolve");
		}
	} else {
		var content = require("./WebpackMissingModule").module(dep.request);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};
