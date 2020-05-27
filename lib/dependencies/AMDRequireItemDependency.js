/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

class AMDRequireItemDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);

		this.range = range;
	}

	get type() {
		return "amd require";
	}

	get category() {
		return "amd";
	}
}

makeSerializable(
	AMDRequireItemDependency,
	"webpack/lib/dependencies/AMDRequireItemDependency"
);

AMDRequireItemDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = AMDRequireItemDependency;
