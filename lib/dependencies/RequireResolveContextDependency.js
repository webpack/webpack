/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");
const ContextDependencyTemplateAsId = require("./ContextDependencyTemplateAsId");

class RequireResolveContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return "amd require context";
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

RequireResolveContextDependency.Template = ContextDependencyTemplateAsId;

module.exports = RequireResolveContextDependency;
