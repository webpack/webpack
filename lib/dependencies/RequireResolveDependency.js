/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function RequireResolveDependency(request, range) {
	ModuleDependency.call(this, request);
	this.range = range;
}
module.exports = RequireResolveDependency;

RequireResolveDependency.prototype = Object.create(ModuleDependency.prototype);
RequireResolveDependency.prototype.constructor = RequireResolveDependency;
RequireResolveDependency.prototype.type = "require.resolve";

RequireResolveDependency.Template = require("./ModuleDependencyTemplateAsId");
