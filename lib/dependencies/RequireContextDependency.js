/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");

function RequireContextDependency(request, recursive, regExp, range) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.Class = RequireContextDependency;
}
module.exports = RequireContextDependency;

RequireContextDependency.prototype = Object.create(ContextDependency.prototype);
RequireContextDependency.prototype.constructor = RequireContextDependency;
RequireContextDependency.prototype.type = "require.context";

RequireContextDependency.Template = require("./ModuleDependencyTemplateAsRequireId");
