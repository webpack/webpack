"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class RequireResolveDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}
}
RequireResolveDependency.Template = require("./ModuleDependencyTemplateAsId");
RequireResolveDependency.prototype.type = "require.resolve";
module.exports = RequireResolveDependency;
