/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ImportContextDependency = require("./ImportContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportEagerWeakContextDependency extends ImportContextDependency {
	constructor(request, recursive, regExp, range, valueRange, chunkName) {
		super(request, recursive, regExp, range, valueRange, chunkName);
		this.async = "eager-weak";
	}

	get type() {
		return "import() context eager-weak";
	}
}

ImportEagerWeakContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportEagerWeakContextDependency;
