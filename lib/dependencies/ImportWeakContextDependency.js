/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ImportContextDependency = require("./ImportContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportWeakContextDependency extends ImportContextDependency {
	constructor(request, recursive, regExp, range, valueRange, chunkName) {
		super(request, recursive, regExp, range, valueRange, chunkName);
		this.async = "async-weak";
	}

	get type() {
		return "import() context weak";
	}
}

ImportWeakContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportWeakContextDependency;
