/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function ModuleHotDeclineDependency(request, range) {
	ModuleDependency.call(this, request);
	this.Class = ModuleHotDeclineDependency;
	this.range = range;
	this.weak = true;
}
module.exports = ModuleHotDeclineDependency;

ModuleHotDeclineDependency.prototype = Object.create(ModuleDependency.prototype);
ModuleHotDeclineDependency.prototype.constructor = ModuleHotDeclineDependency;
ModuleHotDeclineDependency.prototype.type = "module.hot.decline";

ModuleHotDeclineDependency.Template = require("./ModuleDependencyTemplateAsId");
