/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");
var CriticalDependencyWarning = require("./CriticalDependencyWarning");

function ImportContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
	this.async = true;
}
module.exports = ImportContextDependency;

ImportContextDependency.prototype = Object.create(ContextDependency.prototype);
ImportContextDependency.prototype.constructor = ImportContextDependency;
ImportContextDependency.prototype.type = "System.import context";

ImportContextDependency.prototype.getWarnings = function() {
	if(this.critical) {
		return [
			new CriticalDependencyWarning(this.critical)
		];
	}
};

ImportContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
