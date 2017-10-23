/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ImportContextDependency = require("./ImportContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportLazyContextDependency extends ImportContextDependency {
	constructor(request, recursive, regExp, range, valueRange, chunkName) {
		super(request, recursive, regExp, range, valueRange, chunkName);
		this.async = "lazy";
	}

	get type() {
		return "import() context lazy";
	}

	serialize() {
		return {
			path: __filename,
			options: [
				this.request,
				this.recursive,
				{
					serializedRegExp: this.regExp.toString()
				},
				this.range,
				this.valueRange,
				this.chunkName
			],
		};
	}
}

ImportLazyContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportLazyContextDependency;
