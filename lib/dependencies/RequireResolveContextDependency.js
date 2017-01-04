"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
class RequireResolveContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
	}

	getWarnings() {
		if(this.critical) {
			return [new CriticalDependencyWarning(this.critical)];
		}
	}
}
RequireResolveContextDependency.Template = require("./ContextDependencyTemplateAsId");
RequireResolveContextDependency.prototype.type = "amd require context";
module.exports = RequireResolveContextDependency;
