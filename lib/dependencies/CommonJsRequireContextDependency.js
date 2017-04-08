/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class CommonJsRequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return "cjs require context";
	}

	getWarnings() {
		if(!this.critical) {
			return;
		}

		return [
			new CriticalDependencyWarning(this.critical)
		];
	}
}

CommonJsRequireContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = CommonJsRequireContextDependency;
