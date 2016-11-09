/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function CommonJsRequireDependency(request, range) {
	ModuleDependency.call(this, request);
	this.range = range;
}
module.exports = CommonJsRequireDependency;

CommonJsRequireDependency.prototype = Object.create(ModuleDependency.prototype);
CommonJsRequireDependency.prototype.constructor = CommonJsRequireDependency;
CommonJsRequireDependency.prototype.type = "cjs require";

CommonJsRequireDependency.Template = require("./ModuleDependencyTemplateAsId");
