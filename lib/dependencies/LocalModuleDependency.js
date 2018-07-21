/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

class LocalModuleDependency extends NullDependency {
	constructor(localModule, range) {
		super();
		localModule.flagUsed();
		this.localModule = localModule;
		this.range = range;
	}
}

LocalModuleDependency.Template = class LocalModuleDependencyTemplate {
	apply(dep, source) {
		if(!dep.range) return;
		source.replace(dep.range[0], dep.range[1] - 1, dep.localModule.variableName());
	}
};

module.exports = LocalModuleDependency;
