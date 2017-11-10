/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const NullDependency = require("./NullDependency");

class RequireEnsureItemDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "require.ensure item";
	}

	serialize() {
		return {
			path: __filename,
			options: [this.request],
		};
	}
}

RequireEnsureItemDependency.Template = NullDependency.Template;

module.exports = RequireEnsureItemDependency;
