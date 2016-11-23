/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");
var CriticalDependencyWarning = require("./CriticalDependencyWarning");

function RequireResolveContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
}
module.exports = RequireResolveContextDependency;

RequireResolveContextDependency.prototype = Object.create(ContextDependency.prototype);
RequireResolveContextDependency.prototype.constructor = RequireResolveContextDependency;
RequireResolveContextDependency.prototype.type = "amd require context";

RequireResolveContextDependency.prototype.getWarnings = function() {
	if(this.critical) {
		return [
			new CriticalDependencyWarning(this.critical)
		];
	}
};

RequireResolveContextDependency.Template = require("./ContextDependencyTemplateAsId");
