/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependency = require("./ContextDependency");
var CriticalDependencyWarning = require("./CriticalDependencyWarning");

function SystemImportContextDependency(request, recursive, regExp, range, valueRange) {
	ContextDependency.call(this, request, recursive, regExp);
	this.range = range;
	this.valueRange = valueRange;
	this.async = true;
}
module.exports = SystemImportContextDependency;

SystemImportContextDependency.prototype = Object.create(ContextDependency.prototype);
SystemImportContextDependency.prototype.constructor = SystemImportContextDependency;
SystemImportContextDependency.prototype.type = "System.import context";

SystemImportContextDependency.prototype.getWarnings = function() {
	if(this.critical) {
		return [
			new CriticalDependencyWarning(this.critical)
		];
	}
};

SystemImportContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
