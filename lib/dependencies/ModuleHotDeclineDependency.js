/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");

class ModuleHotDeclineDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
		this.weak = true;
		/** @type {HarmonyDependencySourceLocation} */
		this.loc = undefined;
	}

	get type() {
		return "module.hot.decline";
	}
}

ModuleHotDeclineDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ModuleHotDeclineDependency;
