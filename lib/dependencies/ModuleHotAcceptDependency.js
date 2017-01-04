"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");
class ModuleHotAcceptDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
		this.weak = true;
	}
}
ModuleHotAcceptDependency.Template = ModuleDependencyTemplateAsId;
ModuleHotAcceptDependency.prototype.type = "module.hot.accept";
module.exports = ModuleHotAcceptDependency;
