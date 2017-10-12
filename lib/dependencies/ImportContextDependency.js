/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange, chunkName) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
		this.chunkName = chunkName;
		this.filter = null;
		this.exclude = null;
	}

	get type() {
		return "import() context";
	}

}

ImportContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportContextDependency;
