/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
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

}

CommonJsRequireContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = CommonJsRequireContextDependency;
