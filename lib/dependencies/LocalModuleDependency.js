"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source) {
		if(!dep.range) {
			return;
		}
		source.replace(dep.range[0], dep.range[1] - 1, dep.localModule.variableName());
	}
}
class LocalModuleDependency extends NullDependency {
	constructor(localModule, range) {
		super();
		this.localModule = localModule;
		this.range = range;
		localModule.flagUsed();
	}
}
LocalModuleDependency.Template = Template;
module.exports = LocalModuleDependency;
