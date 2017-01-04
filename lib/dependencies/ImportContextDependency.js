"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
class ImportContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
		this.async = true;
	}

	getWarnings() {
		if(this.critical) {
			return [new CriticalDependencyWarning(this.critical)];
		}
	}
}
ImportContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
ImportContextDependency.prototype.type = "System.import context";
module.exports = ImportContextDependency;
