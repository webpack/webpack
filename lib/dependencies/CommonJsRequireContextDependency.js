"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
class CommonJsRequireContextDependency extends ContextDependency {
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
CommonJsRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
CommonJsRequireContextDependency.prototype.type = "cjs require context";
module.exports = CommonJsRequireContextDependency;
