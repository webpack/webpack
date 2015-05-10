/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");

function RequireResolveContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
	this.Class = RequireResolveContextDependency;
}
module.exports = RequireResolveContextDependency;

RequireResolveContextDependency.prototype = Object.create(ContextDependency.prototype);
RequireResolveContextDependency.prototype.constructor = RequireResolveContextDependency;
RequireResolveContextDependency.prototype.type = "amd require context";

RequireResolveContextDependency.Template = require("./ContextDependencyTemplateAsId");
