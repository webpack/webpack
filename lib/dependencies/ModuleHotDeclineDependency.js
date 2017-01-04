"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");
class ModuleHotDeclineDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
		this.weak = true;
	}
}
ModuleHotDeclineDependency.Template = ModuleDependencyTemplateAsId;
ModuleHotDeclineDependency.prototype.type = "module.hot.decline";
module.exports = ModuleHotDeclineDependency;
