/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");

function CommonJsRequireContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
	this.Class = CommonJsRequireContextDependency;
}
module.exports = CommonJsRequireContextDependency;

CommonJsRequireContextDependency.prototype = Object.create(ContextDependency.prototype);
CommonJsRequireContextDependency.prototype.type = "cjs require context";

CommonJsRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
