/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class ModuleDependencyTemplateAsId {

	apply(dep, source, runtime) {
		if(!dep.range) return;
		const comment = runtime.outputOptions.pathinfo ?
			Template.toComment(runtime.requestShortener.shorten(dep.request)) + " " : "";
		let content;
		if(dep.module)
			content = comment + JSON.stringify(dep.module.id);
		else
			content = require("./WebpackMissingModule").module(dep.request);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
}
module.exports = ModuleDependencyTemplateAsId;
