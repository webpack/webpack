"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ContextDependency = require("./ContextDependency");
class RequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range) {
		super(request, recursive, regExp);
		this.range = range;
	}
}
RequireContextDependency.Template = require("./ModuleDependencyTemplateAsRequireId");
RequireContextDependency.prototype.type = "require.context";
module.exports = RequireContextDependency;
