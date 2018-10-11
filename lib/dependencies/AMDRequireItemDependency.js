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

	serialize(context) {
		const { write } = context;

		write(this.range);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.range = read();

		super.deserialize(context);
	}
}

makeSerializable(
	AMDRequireItemDependency,
	"webpack/lib/dependencies/AMDRequireItemDependency"
);

AMDRequireItemDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = AMDRequireItemDependency;
