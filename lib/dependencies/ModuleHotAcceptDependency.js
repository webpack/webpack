/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");

class ModuleHotAcceptDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
		this.weak = true;
	}

	get type() {
		return "module.hot.accept";
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
	ModuleHotAcceptDependency,
	"webpack/lib/dependencies/ModuleHotAcceptDependency"
);

ModuleHotAcceptDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ModuleHotAcceptDependency;
