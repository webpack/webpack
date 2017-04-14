/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
class AMDRequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return "amd require context";
	}

	getWarnings() {
		if(this.critical) {
			return [
				new CriticalDependencyWarning(this.critical)
			];
		}
	}
}
AMDRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");
module.exports = AMDRequireContextDependency;
