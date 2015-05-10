/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");

function AMDRequireContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
	this.Class = AMDRequireContextDependency;
}
module.exports = AMDRequireContextDependency;

AMDRequireContextDependency.prototype = Object.create(ContextDependency.prototype);
AMDRequireContextDependency.prototype.constructor = AMDRequireContextDependency;
AMDRequireContextDependency.prototype.type = "amd require context";

AMDRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
