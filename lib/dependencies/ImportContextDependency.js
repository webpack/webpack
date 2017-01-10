/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
		this.async = true;
	}

	get type() {
		return "System.import context";
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

ImportContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportContextDependency;
