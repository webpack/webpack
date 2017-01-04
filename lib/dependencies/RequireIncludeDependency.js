"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		let comment = "";
		if(outputOptions.pathinfo && dep.module) {
			comment = `/*! require.include ${requestShortener.shorten(dep.request)} */`;
		}
		source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
	}
}
class RequireIncludeDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}
}
RequireIncludeDependency.Template = Template;
RequireIncludeDependency.prototype.type = "require.include";
module.exports = RequireIncludeDependency;
