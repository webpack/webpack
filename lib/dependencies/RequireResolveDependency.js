/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyAsId = require("./ModuleDependencyTemplateAsId");

class RequireResolveDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "require.resolve";
	}

	serialize() {
		return {
			path: __filename,
			options: [this.request, this.range],
		};
	}
}

RequireResolveDependency.Template = ModuleDependencyAsId;

module.exports = RequireResolveDependency;
