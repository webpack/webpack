/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ContextDependency = require("./ContextDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

class RequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, asyncMode, range) {
		super(request, recursive, regExp);
		this.range = range;

		if(asyncMode) {
			this.async = asyncMode;
		}
	}

	get type() {
		return "require.context";
	}

	serialize() {
		return {
			path: __filename,
			options: [
				this.request,
				this.recursive,
				{
					serializedRegExp: this.regExp ? this.regExp.toString() : null
				},
				this.asyncMode,
				this.range
			],
		};
	}
}

RequireContextDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = RequireContextDependency;
