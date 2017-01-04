"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class AMDRequireItemDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}
}
AMDRequireItemDependency.Template = require("./ModuleDependencyTemplateAsRequireId");
AMDRequireItemDependency.prototype.type = "amd require";
module.exports = AMDRequireItemDependency;
