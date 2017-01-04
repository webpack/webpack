"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class CommonJsRequireDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}
}
CommonJsRequireDependency.Template = require("./ModuleDependencyTemplateAsId");
CommonJsRequireDependency.prototype.type = "cjs require";
module.exports = CommonJsRequireDependency;
