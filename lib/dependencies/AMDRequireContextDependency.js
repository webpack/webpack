/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");
var CriticalDependencyWarning = require("./CriticalDependencyWarning");

function AMDRequireContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
}
module.exports = AMDRequireContextDependency;

AMDRequireContextDependency.prototype = Object.create(ContextDependency.prototype);
AMDRequireContextDependency.prototype.constructor = AMDRequireContextDependency;
AMDRequireContextDependency.prototype.type = "amd require context";

AMDRequireContextDependency.prototype.getWarnings = function() {
	if(this.critical) {
		return [
			new CriticalDependencyWarning(this.critical)
		];
	}
};

AMDRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
