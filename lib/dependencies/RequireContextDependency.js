/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

function equalRegExp(a, b) {
	if(a === b) return true;
	if(typeof a !== "object" || typeof b !== "object") return false;
	return a + "" === b + "";
}

class RequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, options) {
		super(request, recursive, regExp);
		this.range = range;

		this.options = options;
	}

	isEqualResource(other) {
		if(!super.isEqualResource(other)) return false;

		if(!(other instanceof RequireContextDependency))
			return false;

		return this.options.async === other.options.async &&
			this.options.chunkName === other.options.chunkName &&
			equalRegExp(this.options.include, other.options.include) &&
			equalRegExp(this.options.exclude, other.options.exclude);
	}

	get type() {
		return "require.context";
	}
}

RequireContextDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = RequireContextDependency;
