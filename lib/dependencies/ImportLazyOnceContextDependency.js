/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ImportContextDependency = require("./ImportContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportLazyOnceContextDependency extends ImportContextDependency {
	constructor(request, recursive, regExp, range, valueRange, chunkName) {
		super(request, recursive, regExp, range, valueRange, chunkName);
		this.async = "lazy-once";
	}

	get type() {
		return "import() context lazy-once";
	}
}

ImportLazyOnceContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportLazyOnceContextDependency;
