/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class ContextDependencyTemplateAsRequireCall {

	apply(dep, source, runtime) {
		const comment = runtime.outputOptions.pathinfo ? Template.toComment(runtime.requestShortener.shorten(dep.options.request)) + " " : "";

		const containsDeps = dep.module && dep.module.dependencies && dep.module.dependencies.length > 0;
		const isAsync = dep.options.mode !== "sync" && dep.options.mode !== "weak";
		if(dep.module && (isAsync || containsDeps)) {
			if(dep.valueRange) {
				if(Array.isArray(dep.replaces)) {
					for(let i = 0; i < dep.replaces.length; i++) {
						const rep = dep.replaces[i];
						source.replace(rep.range[0], rep.range[1] - 1, rep.value);
					}
				}
				source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
				source.replace(dep.range[0], dep.valueRange[0] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")(" + (typeof dep.prepend === "string" ? JSON.stringify(dep.prepend) : "") + "");
			} else {
				source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")");
			}
		} else {
			const content = require("./WebpackMissingModule").module(dep.request);
			source.replace(dep.range[0], dep.range[1] - 1, content);
		}
	}
}
module.exports = ContextDependencyTemplateAsRequireCall;
