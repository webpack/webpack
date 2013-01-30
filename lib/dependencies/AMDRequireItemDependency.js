/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function AMDRequireItemDependency(request, range) {
	ModuleDependency.call(this, request);
	this.Class = AMDRequireItemDependency;
	this.range = range;
}
module.exports = AMDRequireItemDependency;

AMDRequireItemDependency.prototype = Object.create(ModuleDependency.prototype);
AMDRequireItemDependency.prototype.type = "amd require";

AMDRequireItemDependency.Template = require("./ModuleDependencyTemplateAsRequireId");
